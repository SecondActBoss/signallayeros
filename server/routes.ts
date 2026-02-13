import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scoreAndRouteSignal, generateInsight, generateContentDrafts } from "./scoring";
import { insertSignalSchema, bulkSignalImportSchema, type ScoredLead } from "@shared/schema";
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
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const insights = await storage.getInsightsByDateRange(
        weekAgo.toISOString(),
        now.toISOString()
      );
      
      const allInsights = insights.length > 0 ? insights : await storage.getInsights();
      
      if (allInsights.length === 0) {
        res.status(400).json({ message: "No insights available to generate content from" });
        return;
      }
      
      const contexts: ("ICP" | "Positioning" | "Be Contrary")[] = ["ICP", "Positioning"];
      
      const focusedVertical = await storage.getFocusedVertical();
      
      const { linkedInDrafts, xDrafts } = generateContentDrafts(allInsights, contexts, focusedVertical);
      
      const run = await storage.createContentRun({
        runDate: now.toISOString(),
        insightIds: allInsights.map((i) => i.id),
        linkedInDrafts,
        xDrafts,
        contexts,
        status: "completed",
      });
      
      res.json({ ...run, focusedVertical });
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

  // Vertical Cluster Detection
  app.get("/api/verticals/clusters", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const cutoffA = new Date(now - 14 * day);
      const cutoffB = new Date(now - 28 * day);

      const industryMap: Record<string, { windowA: ScoredLead[]; windowB: ScoredLead[] }> = {};

      for (const lead of leads) {
        const industry = lead.industry || "Unknown";
        if (!industryMap[industry]) {
          industryMap[industry] = { windowA: [], windowB: [] };
        }
        const created = new Date(lead.createdAt);
        if (created >= cutoffA) {
          industryMap[industry].windowA.push(lead);
        } else if (created >= cutoffB) {
          industryMap[industry].windowB.push(lead);
        }
      }

      type ClusterResult = {
        industry: string;
        leadsLast14Days: number;
        growthRate: number;
        avgScore: number;
        score5Count: number;
        clusterStrength: "High" | "Medium" | "Emerging";
      };

      const clusters: ClusterResult[] = [];

      for (const [industry, windows] of Object.entries(industryMap)) {
        const countA = windows.windowA.length;
        const countB = windows.windowB.length;
        const growthRate = (countA - countB) / Math.max(countB, 1);
        const avgScore = countA > 0
          ? Math.round((windows.windowA.reduce((s, l) => s + l.confidenceScore, 0) / countA) * 10) / 10
          : 0;
        const score5Count = windows.windowA.filter((l) => l.confidenceScore === 5).length;

        const meetsThreshold = countA >= 5 && avgScore >= 3.5 && score5Count >= 2 && growthRate > 0.5;

        if (!meetsThreshold) continue;

        let clusterStrength: "High" | "Medium" | "Emerging";
        if (avgScore > 4 && score5Count >= 3) {
          clusterStrength = "High";
        } else if (avgScore > 3.5 && growthRate <= 1) {
          clusterStrength = "Medium";
        } else if (growthRate > 1) {
          clusterStrength = avgScore > 4 ? "High" : "Emerging";
        } else {
          clusterStrength = "Medium";
        }

        clusters.push({
          industry,
          leadsLast14Days: countA,
          growthRate: Math.round(growthRate * 100) / 100,
          avgScore,
          score5Count,
          clusterStrength,
        });
      }

      clusters.sort((a, b) => {
        const strengthOrder = { High: 0, Medium: 1, Emerging: 2 };
        return strengthOrder[a.clusterStrength] - strengthOrder[b.clusterStrength] || b.avgScore - a.avgScore;
      });

      res.json(clusters);
    } catch (error) {
      res.status(500).json({ message: "Failed to detect clusters" });
    }
  });

  // Weekly Vertical Focus Engine
  app.get("/api/verticals/weekly-focus", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const cutoff30d = new Date(now - 30 * day);
      const cutoff14d = new Date(now - 14 * day);
      const cutoff28d = new Date(now - 28 * day);

      if (leads.length === 0) {
        res.json(null);
        return;
      }

      const industryMap: Record<string, {
        leads30d: ScoredLead[];
        leadsAll: ScoredLead[];
        windowA: ScoredLead[];
        windowB: ScoredLead[];
      }> = {};

      for (const lead of leads) {
        const industry = lead.industry || "Unknown";
        if (!industryMap[industry]) {
          industryMap[industry] = { leads30d: [], leadsAll: [], windowA: [], windowB: [] };
        }
        const entry = industryMap[industry];
        entry.leadsAll.push(lead);
        const created = new Date(lead.createdAt);
        if (created >= cutoff30d) entry.leads30d.push(lead);
        if (created >= cutoff14d) entry.windowA.push(lead);
        else if (created >= cutoff28d) entry.windowB.push(lead);
      }

      type VerticalCandidate = {
        industry: string;
        totalPainScore30d: number;
        avgPainScore30d: number;
        growthRate: number;
        leads30d: ScoredLead[];
        leadsAll: ScoredLead[];
      };

      const candidates: VerticalCandidate[] = [];
      for (const [industry, data] of Object.entries(industryMap)) {
        const totalPainScore30d = data.leads30d.reduce((s, l) => s + l.confidenceScore, 0);
        const avgPainScore30d = data.leads30d.length > 0
          ? Math.round((totalPainScore30d / data.leads30d.length) * 10) / 10
          : 0;
        const countA = data.windowA.length;
        const countB = data.windowB.length;
        const growthRate = (countA - countB) / Math.max(countB, 1);

        candidates.push({
          industry,
          totalPainScore30d,
          avgPainScore30d,
          growthRate: Math.round(growthRate * 100) / 100,
          leads30d: data.leads30d,
          leadsAll: data.leadsAll,
        });
      }

      let selected = candidates
        .filter((c) => c.avgPainScore30d >= 3.5 && c.growthRate > 0.3 && c.leads30d.length > 0)
        .sort((a, b) => b.totalPainScore30d - a.totalPainScore30d)[0];

      if (!selected) {
        selected = candidates
          .filter((c) => c.leadsAll.length > 0)
          .sort((a, b) => {
            const totalA = a.leadsAll.reduce((s, l) => s + l.confidenceScore, 0);
            const totalB = b.leadsAll.reduce((s, l) => s + l.confidenceScore, 0);
            return totalB - totalA;
          })[0];
      }

      if (!selected) {
        res.json(null);
        return;
      }

      const relevantLeads = selected.leads30d.length > 0 ? selected.leads30d : selected.leadsAll;

      const painCounts: Record<string, number> = {};
      const aiEmployeeCounts: Record<string, number> = {};
      for (const lead of relevantLeads) {
        if (lead.hasCoordinationOverload) painCounts["Coordination Overload"] = (painCounts["Coordination Overload"] || 0) + 1;
        if (lead.hasTurnoverFragility) painCounts["Turnover Fragility"] = (painCounts["Turnover Fragility"] || 0) + 1;
        if (lead.hasInboundFriction) painCounts["Inbound Friction"] = (painCounts["Inbound Friction"] || 0) + 1;
        if (lead.hasRevenueProximity) painCounts["Revenue Proximity"] = (painCounts["Revenue Proximity"] || 0) + 1;
        aiEmployeeCounts[lead.aiEmployeeName] = (aiEmployeeCounts[lead.aiEmployeeName] || 0) + 1;
      }

      const dominantPainSignal = Object.entries(painCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      const primaryAIAgentDemand = Object.entries(aiEmployeeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      const topLeads = [...relevantLeads]
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 3);
      const topPainQuotes = topLeads.map((l) => l.painQuote);

      const painLabel = dominantPainSignal.toLowerCase().replace(/\s+/g, " ");
      const reasonParts: string[] = [];
      if (selected.leads30d.length > 0) {
        reasonParts.push(`Highest pain density (${selected.totalPainScore30d} total score across ${selected.leads30d.length} leads in 30d)`);
      } else {
        reasonParts.push(`Highest overall pain density`);
      }
      if (selected.growthRate > 0.3) {
        reasonParts.push(`strong growth (+${Math.round(selected.growthRate * 100)}%)`);
      }
      reasonParts.push(`dominant signal: ${painLabel}`);
      const reasonSelected = reasonParts.join(" with ");

      const suggestedBlueprintTitle = `AI Staffing Blueprint for ${selected.industry}`;

      const contentAngleMap: Record<string, string[]> = {
        "Coordination Overload": ["Handoff fatigue destroying team velocity", "Why coordination is the hidden tax on growth", "The follow-up trap operators can't escape"],
        "Turnover Fragility": ["Staff turnover as silent revenue drain", "Why rehiring the same role is a systems problem", "Building roles that don't break when people leave"],
        "Inbound Friction": ["Inbound revenue leakage from missed opportunities", "Phone chaos and the cost of slow response", "Why missed calls are silent churn"],
        "Revenue Proximity": ["Pipeline visibility without the manual work", "Revenue at risk from operational friction", "Deals stalling from process bottlenecks"],
      };
      const suggestedContentAngles = contentAngleMap[dominantPainSignal] || [
        `${dominantPainSignal} impact on ${selected.industry}`,
        `Operator burnout in ${selected.industry}`,
        `Scaling past manual work in ${selected.industry}`,
      ];

      res.json({
        industry: selected.industry,
        reasonSelected,
        dominantPainSignal,
        primaryAIAgentDemand,
        topPainQuotes,
        suggestedBlueprintTitle,
        suggestedContentAngles,
        totalLeads: relevantLeads.length,
        avgScore: selected.leads30d.length > 0 ? selected.avgPainScore30d
          : Math.round((selected.leadsAll.reduce((s, l) => s + l.confidenceScore, 0) / selected.leadsAll.length) * 10) / 10,
        growthRate: selected.growthRate,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Weekly focus error:", error);
      res.status(500).json({ message: "Failed to generate weekly focus" });
    }
  });

  // Focused Vertical
  app.get("/api/verticals/focus", async (req, res) => {
    try {
      const focused = await storage.getFocusedVertical();
      res.json({ focusedVertical: focused });
    } catch (error) {
      res.status(500).json({ message: "Failed to get focused vertical" });
    }
  });

  app.post("/api/verticals/focus", async (req, res) => {
    try {
      const { industry } = req.body;
      await storage.setFocusedVertical(industry || null);
      res.json({ focusedVertical: industry || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to set focused vertical" });
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
