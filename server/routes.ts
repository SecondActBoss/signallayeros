import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scoreAndRouteSignal, generateInsight, generateContentDrafts } from "./scoring";
import { insertSignalSchema, bulkSignalImportSchema } from "@shared/schema";
import { z } from "zod";
import { appendToSheet } from "./googleSheets";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Signals
  app.get("/api/signals", async (req, res) => {
    try {
      const signals = await storage.getSignals();
      res.json(signals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch signals" });
    }
  });

  app.get("/api/signals/recent", async (req, res) => {
    try {
      const signals = await storage.getRecentSignals(10);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent signals" });
    }
  });

  app.post("/api/signals", async (req, res) => {
    try {
      const data = insertSignalSchema.parse(req.body);
      
      // Create signal
      const signal = await storage.createSignal(data);
      
      // Score and route to create lead
      const leadData = scoreAndRouteSignal(signal);
      const lead = await storage.createLead(leadData);
      
      // Generate insight for content
      const insightData = generateInsight(signal, lead);
      await storage.createInsight(insightData);
      
      res.json({ signal, lead });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid signal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create signal" });
      }
    }
  });

  app.post("/api/signals/bulk", async (req, res) => {
    try {
      const { signals } = bulkSignalImportSchema.parse(req.body);
      
      let signalsCreated = 0;
      let leadsCreated = 0;
      let insightsCreated = 0;
      
      for (const signalData of signals) {
        try {
          // Create signal
          const signal = await storage.createSignal(signalData);
          signalsCreated++;
          
          // Score and route to create lead
          const leadData = scoreAndRouteSignal(signal);
          const lead = await storage.createLead(leadData);
          leadsCreated++;
          
          // Generate insight for content
          const insightData = generateInsight(signal, lead);
          await storage.createInsight(insightData);
          insightsCreated++;
        } catch (e) {
          // Continue processing other signals
          console.error("Error processing signal:", e);
        }
      }
      
      res.json({ signalsCreated, leadsCreated, insightsCreated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid bulk signal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process bulk signals" });
      }
    }
  });

  // External automated ingestion (for Manus, etc.)
  app.post("/api/ingest/external", async (req, res) => {
    try {
      // Validate API key
      const apiKey = req.headers["x-api-key"];
      const expectedKey = process.env.INGEST_API_KEY;
      
      if (!expectedKey) {
        console.error("INGEST_API_KEY not configured");
        res.status(500).json({ message: "Ingestion endpoint not configured" });
        return;
      }
      
      if (!apiKey || apiKey !== expectedKey) {
        res.status(401).json({ message: "Invalid or missing API key" });
        return;
      }
      
      const { signals } = bulkSignalImportSchema.parse(req.body);
      const sourceName = (req.headers["x-source"] as string) || "Manus";
      
      let signalsCreated = 0;
      let duplicatesSkipped = 0;
      let leadsCreated = 0;
      let insightsCreated = 0;
      const errors: string[] = [];
      
      for (const signalData of signals) {
        try {
          // Check for duplicates (idempotency)
          const existing = await storage.findDuplicateSignal(
            signalData.personOrCompanyName,
            signalData.painQuote
          );
          
          if (existing) {
            duplicatesSkipped++;
            continue;
          }
          
          // Create signal with source
          const signalWithSource = {
            ...signalData,
            source: sourceName,
          };
          const signal = await storage.createSignal(signalWithSource);
          signalsCreated++;
          
          // Score and route to create lead
          const leadData = scoreAndRouteSignal(signal);
          const lead = await storage.createLead(leadData);
          leadsCreated++;
          
          // Generate insight for content
          const insightData = generateInsight(signal, lead);
          await storage.createInsight(insightData);
          insightsCreated++;
        } catch (e) {
          errors.push(`Failed to process signal for ${signalData.personOrCompanyName}: ${e}`);
        }
      }
      
      console.log(`[External Ingest] Source: ${sourceName}, Created: ${signalsCreated}, Duplicates: ${duplicatesSkipped}`);
      
      res.json({ 
        signalsCreated, 
        duplicatesSkipped,
        leadsCreated, 
        insightsCreated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid signal data", errors: error.errors });
      } else {
        console.error("External ingestion error:", error);
        res.status(500).json({ message: "Failed to process signals" });
      }
    }
  });

  // Leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/recent", async (req, res) => {
    try {
      const leads = await storage.getRecentLeads(10);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent leads" });
    }
  });

  app.post("/api/leads/export", async (req, res) => {
    try {
      const { spreadsheetId } = req.body;
      
      if (!spreadsheetId) {
        res.status(400).json({ message: "Spreadsheet ID is required" });
        return;
      }
      
      const leads = await storage.getLeads();
      const unexported = leads.filter((l) => !l.exportedToSheets);
      
      if (unexported.length === 0) {
        res.json({ exportedCount: 0, message: "No new leads to export" });
        return;
      }
      
      // Format rows for Google Sheets (with headers if first export)
      const headers = [
        "Date Detected",
        "Company/Person",
        "Role",
        "Industry",
        "Company Size",
        "Location",
        "Pain Quote",
        "Pain Summary",
        "Confidence Score",
        "AI Employee",
        "Why This AI Employee",
        "Source URL"
      ];
      
      const rows = unexported.map((lead) => [
        lead.dateDetected,
        lead.personOrCompanyName,
        lead.role,
        lead.industry,
        lead.companySizeEstimate,
        lead.location,
        lead.painQuote,
        lead.painSummary,
        String(lead.confidenceScore),
        lead.aiEmployeeName,
        lead.whyThisAIEmployee,
        lead.sourceUrl || ""
      ]);
      
      // Check if this is likely the first export (add headers)
      const allExported = leads.filter((l) => l.exportedToSheets);
      const dataToAppend = allExported.length === 0 ? [headers, ...rows] : rows;
      
      // Push to Google Sheets
      await appendToSheet(spreadsheetId, dataToAppend);
      
      // Mark as exported
      await storage.markLeadsExported(unexported.map((l) => l.id));
      
      res.json({ exportedCount: unexported.length, message: `Exported ${unexported.length} leads to Google Sheets` });
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ message: error.message || "Failed to export leads" });
    }
  });

  // Insights
  app.get("/api/insights", async (req, res) => {
    try {
      const insights = await storage.getInsights();
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  // Content Runs
  app.get("/api/content-runs", async (req, res) => {
    try {
      const runs = await storage.getContentRuns();
      res.json(runs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content runs" });
    }
  });

  app.post("/api/content-runs/generate", async (req, res) => {
    try {
      // Get insights from last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const insights = await storage.getInsightsByDateRange(
        weekAgo.toISOString(),
        now.toISOString()
      );
      
      // If no recent insights, get all available
      const allInsights = insights.length > 0 ? insights : await storage.getInsights();
      
      if (allInsights.length === 0) {
        res.status(400).json({ message: "No insights available to generate content from" });
        return;
      }
      
      // Default contexts
      const contexts: ("ICP" | "Positioning" | "Be Contrary")[] = ["ICP", "Positioning"];
      
      // Generate content drafts
      const { linkedInDrafts, xDrafts } = generateContentDrafts(allInsights, contexts);
      
      // Create content run
      const run = await storage.createContentRun({
        runDate: now.toISOString(),
        insightIds: allInsights.map((i) => i.id),
        linkedInDrafts,
        xDrafts,
        contexts,
        status: "completed",
      });
      
      res.json(run);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // Vertical Intelligence ranking
  app.get("/api/verticals/rank", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const timeRange = req.query.range as string | undefined;
      
      let filteredLeads = leads;
      if (timeRange === "7d") {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filteredLeads = leads.filter((l) => new Date(l.createdAt) >= cutoff);
      } else if (timeRange === "30d") {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        filteredLeads = leads.filter((l) => new Date(l.createdAt) >= cutoff);
      }

      const industryMap: Record<string, {
        totalLeads: number;
        totalPainScore: number;
        countScore5: number;
        countScore4Plus: number;
        painCounts: Record<string, number>;
      }> = {};

      for (const lead of filteredLeads) {
        const industry = lead.industry || "Unknown";
        if (!industryMap[industry]) {
          industryMap[industry] = { totalLeads: 0, totalPainScore: 0, countScore5: 0, countScore4Plus: 0, painCounts: {} };
        }
        const entry = industryMap[industry];
        entry.totalLeads++;
        entry.totalPainScore += lead.confidenceScore;
        if (lead.confidenceScore === 5) entry.countScore5++;
        if (lead.confidenceScore >= 4) entry.countScore4Plus++;

        if (lead.hasCoordinationOverload) entry.painCounts["Coordination Overload"] = (entry.painCounts["Coordination Overload"] || 0) + 1;
        if (lead.hasTurnoverFragility) entry.painCounts["Turnover Fragility"] = (entry.painCounts["Turnover Fragility"] || 0) + 1;
        if (lead.hasInboundFriction) entry.painCounts["Inbound Friction"] = (entry.painCounts["Inbound Friction"] || 0) + 1;
        if (lead.hasRevenueProximity) entry.painCounts["Revenue Proximity"] = (entry.painCounts["Revenue Proximity"] || 0) + 1;
      }

      const ranked = Object.entries(industryMap)
        .map(([industry, data]) => {
          const painEntries = Object.entries(data.painCounts);
          painEntries.sort((a, b) => b[1] - a[1]);
          return {
            industry,
            totalLeads: data.totalLeads,
            totalPainScore: data.totalPainScore,
            avgPainScore: Math.round((data.totalPainScore / data.totalLeads) * 10) / 10,
            countScore5: data.countScore5,
            countScore4Plus: data.countScore4Plus,
            dominantPainSignal: painEntries.length > 0 ? painEntries[0][0] : "None",
          };
        })
        .sort((a, b) => b.totalPainScore - a.totalPainScore || b.countScore5 - a.countScore5)
        .slice(0, 10);

      res.json(ranked);
    } catch (error) {
      res.status(500).json({ message: "Failed to rank verticals" });
    }
  });

  // ContentLayerOS ingestion endpoint
  app.post("/api/content-layer/ingest", async (req, res) => {
    try {
      const { run_id, insights: insightRecords, applied_contexts, source, cadence } = req.body;
      
      // Validate payload
      if (!insightRecords || !Array.isArray(insightRecords)) {
        res.status(400).json({ message: "insights array is required" });
        return;
      }
      
      res.json({
        received: true,
        run_id: run_id || `run-${Date.now()}`,
        insights_count: insightRecords.length,
        applied_contexts: applied_contexts || [],
        source: source || "SignalLayerOS",
        cadence: cadence || "weekly",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to ingest content" });
    }
  });

  return httpServer;
}
