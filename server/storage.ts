import { randomUUID } from "crypto";
import type {
  Signal,
  InsertSignal,
  ScoredLead,
  Insight,
  InsertInsight,
  ContentRun,
  Stats,
  FocusedVertical,
  Prospect,
  InsertProspect,
} from "@shared/schema";
import { AI_EMPLOYEES } from "@shared/schema";

export interface IStorage {
  // Signals
  getSignals(): Promise<Signal[]>;
  getRecentSignals(limit: number): Promise<Signal[]>;
  getSignal(id: string): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  findDuplicateSignal(personOrCompanyName: string, painQuote: string): Promise<Signal | undefined>;
  
  // Leads
  getLeads(): Promise<ScoredLead[]>;
  getRecentLeads(limit: number): Promise<ScoredLead[]>;
  getLead(id: string): Promise<ScoredLead | undefined>;
  createLead(lead: Omit<ScoredLead, "id" | "createdAt">): Promise<ScoredLead>;
  markLeadsExported(ids: string[]): Promise<void>;
  
  // Insights
  getInsights(): Promise<Insight[]>;
  getInsight(id: string): Promise<Insight | undefined>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  getInsightsByDateRange(startDate: string, endDate: string): Promise<Insight[]>;
  
  // Content Runs
  getContentRuns(): Promise<ContentRun[]>;
  getContentRun(id: string): Promise<ContentRun | undefined>;
  createContentRun(run: Omit<ContentRun, "id" | "createdAt">): Promise<ContentRun>;
  
  // Stats
  getStats(): Promise<Stats>;

  // Focused Vertical
  getFocusedVertical(): Promise<FocusedVertical | null>;
  setFocusedVertical(vertical: FocusedVertical | null): Promise<void>;

  // Prospects
  getProspects(filters?: { verticalTag?: string; status?: string }): Promise<Prospect[]>;
  getProspect(id: string): Promise<Prospect | undefined>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: string, updates: Partial<Pick<Prospect, "status" | "notes">>): Promise<Prospect | undefined>;
  markProspectsExported(ids: string[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private signals: Map<string, Signal>;
  private leads: Map<string, ScoredLead>;
  private insights: Map<string, Insight>;
  private contentRuns: Map<string, ContentRun>;
  private focusedVertical: FocusedVertical | null;
  private prospects: Map<string, Prospect>;

  constructor() {
    this.signals = new Map();
    this.leads = new Map();
    this.insights = new Map();
    this.contentRuns = new Map();
    this.focusedVertical = null;
    this.prospects = new Map();
  }

  // Signals
  async getSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentSignals(limit: number): Promise<Signal[]> {
    const all = await this.getSignals();
    return all.slice(0, limit);
  }

  async getSignal(id: string): Promise<Signal | undefined> {
    return this.signals.get(id);
  }

  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const id = randomUUID();
    const signal: Signal = {
      ...insertSignal,
      id,
      createdAt: new Date().toISOString(),
    };
    this.signals.set(id, signal);
    return signal;
  }

  async findDuplicateSignal(personOrCompanyName: string, painQuote: string): Promise<Signal | undefined> {
    const normalizedName = personOrCompanyName.toLowerCase().trim();
    const normalizedQuote = painQuote.toLowerCase().trim();
    
    const signals = Array.from(this.signals.values());
    for (const signal of signals) {
      if (
        signal.personOrCompanyName.toLowerCase().trim() === normalizedName &&
        signal.painQuote.toLowerCase().trim() === normalizedQuote
      ) {
        return signal;
      }
    }
    return undefined;
  }

  // Leads
  async getLeads(): Promise<ScoredLead[]> {
    return Array.from(this.leads.values()).sort(
      (a, b) => b.confidenceScore - a.confidenceScore || 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentLeads(limit: number): Promise<ScoredLead[]> {
    const all = await this.getLeads();
    return all.slice(0, limit);
  }

  async getLead(id: string): Promise<ScoredLead | undefined> {
    return this.leads.get(id);
  }

  async createLead(leadData: Omit<ScoredLead, "id" | "createdAt">): Promise<ScoredLead> {
    const id = randomUUID();
    const lead: ScoredLead = {
      ...leadData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async markLeadsExported(ids: string[]): Promise<void> {
    for (const id of ids) {
      const lead = this.leads.get(id);
      if (lead) {
        this.leads.set(id, { ...lead, exportedToSheets: true });
      }
    }
  }

  // Insights
  async getInsights(): Promise<Insight[]> {
    return Array.from(this.insights.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getInsight(id: string): Promise<Insight | undefined> {
    return this.insights.get(id);
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = randomUUID();
    const insight: Insight = {
      ...insertInsight,
      id,
      createdAt: new Date().toISOString(),
    };
    this.insights.set(id, insight);
    return insight;
  }

  async getInsightsByDateRange(startDate: string, endDate: string): Promise<Insight[]> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return Array.from(this.insights.values()).filter((insight) => {
      const date = new Date(insight.dateDetected).getTime();
      return date >= start && date <= end;
    });
  }

  // Content Runs
  async getContentRuns(): Promise<ContentRun[]> {
    return Array.from(this.contentRuns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getContentRun(id: string): Promise<ContentRun | undefined> {
    return this.contentRuns.get(id);
  }

  async createContentRun(runData: Omit<ContentRun, "id" | "createdAt">): Promise<ContentRun> {
    const id = randomUUID();
    const run: ContentRun = {
      ...runData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.contentRuns.set(id, run);
    return run;
  }

  // Stats
  async getStats(): Promise<Stats> {
    const leads = await this.getLeads();
    const highIntentLeads = leads.filter((l) => l.confidenceScore >= 4).length;
    
    return {
      totalSignals: this.signals.size,
      totalLeads: this.leads.size,
      highIntentLeads,
      contentInsights: this.insights.size,
      contentRuns: this.contentRuns.size,
    };
  }

  // Focused Vertical
  async getFocusedVertical(): Promise<FocusedVertical | null> {
    if (this.focusedVertical?.locked && this.focusedVertical.lockedUntil) {
      const lockExpiry = new Date(this.focusedVertical.lockedUntil).getTime();
      if (Date.now() > lockExpiry) {
        this.focusedVertical = { ...this.focusedVertical, locked: false, lockedUntil: null };
      }
    }
    return this.focusedVertical;
  }

  async setFocusedVertical(vertical: FocusedVertical | null): Promise<void> {
    this.focusedVertical = vertical;
  }

  // Prospects
  async getProspects(filters?: { verticalTag?: string; status?: string }): Promise<Prospect[]> {
    let results = Array.from(this.prospects.values());
    if (filters?.verticalTag) {
      results = results.filter((p) => p.verticalTag.toLowerCase() === filters.verticalTag!.toLowerCase());
    }
    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    return results.sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }

  async getProspect(id: string): Promise<Prospect | undefined> {
    return this.prospects.get(id);
  }

  async createProspect(insert: InsertProspect): Promise<Prospect> {
    const id = randomUUID();
    const prospect: Prospect = {
      ...insert,
      id,
      dateAdded: new Date().toISOString(),
      exportedToSheets: false,
    };
    this.prospects.set(id, prospect);
    return prospect;
  }

  async updateProspect(id: string, updates: Partial<Pick<Prospect, "status" | "notes">>): Promise<Prospect | undefined> {
    const prospect = this.prospects.get(id);
    if (!prospect) return undefined;
    const updated = { ...prospect, ...updates };
    this.prospects.set(id, updated);
    return updated;
  }

  async markProspectsExported(ids: string[]): Promise<void> {
    for (const id of ids) {
      const prospect = this.prospects.get(id);
      if (prospect) {
        this.prospects.set(id, { ...prospect, exportedToSheets: true });
      }
    }
  }
}

export const storage = new MemStorage();
