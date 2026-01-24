import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scoreAndRouteSignal, generateInsight, generateContentDrafts } from "./scoring";
import { insertSignalSchema, bulkSignalImportSchema } from "@shared/schema";
import { z } from "zod";

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
      const leads = await storage.getLeads();
      const unexported = leads.filter((l) => !l.exportedToSheets);
      
      if (unexported.length === 0) {
        res.json({ exportedCount: 0, message: "No new leads to export" });
        return;
      }
      
      // Mark as exported (in a real implementation, this would also push to Google Sheets)
      await storage.markLeadsExported(unexported.map((l) => l.id));
      
      // Format for Google Sheets
      const sheetsData = unexported.map((lead) => ({
        dateDetected: lead.dateDetected,
        leadCompanyName: lead.personOrCompanyName,
        role: lead.role,
        industry: lead.industry,
        companySizeEstimate: lead.companySizeEstimate,
        location: lead.location,
        rawPainQuote: lead.painQuote,
        painSummary: lead.painSummary,
        confidenceScore: lead.confidenceScore,
        recommendedAIEmployee: lead.aiEmployeeName,
        whyThisAIEmployee: lead.whyThisAIEmployee,
        sourceUrl: lead.sourceUrl || "",
      }));
      
      res.json({ exportedCount: unexported.length, sheetsData });
    } catch (error) {
      res.status(500).json({ message: "Failed to export leads" });
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
