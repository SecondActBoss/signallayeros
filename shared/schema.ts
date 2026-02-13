import { z } from "zod";

// AI Employee types for routing
export const AI_EMPLOYEES = [
  { id: "inbound-revenue", name: "Inbound Revenue Agent", description: "Missed calls, voicemail complaints, after-hours loss, inbound lead capture" },
  { id: "appointment-reminder", name: "Appointment Reminder + Rescheduler", description: "No-shows, cancellations, calendar chaos" },
  { id: "lead-reactivation", name: "Lead Reactivation Agent", description: "Dormant leads, CRM rot, paid leads not closed" },
  { id: "outbound-prospector", name: "Outbound Prospector", description: "Manual outbound, pipeline creation fatigue" },
  { id: "email-automation", name: "Email Automation Specialist", description: "Inbox overload, forgotten replies, manual follow-ups" },
  { id: "support-response", name: "Support Response Agent (Omni-Channel)", description: "Customer complaints, response delays, channel chaos" },
  { id: "call-feedback", name: "Call Feedback (MEDDIC) & Follow-Up Engine", description: "Calls happening but deals stalling, founder reviewing calls" },
  { id: "marketing-coordinator", name: "Marketing Coordinator", description: "Inconsistent posting, founder doing marketing themselves" }
] as const;

export type AIEmployeeId = typeof AI_EMPLOYEES[number]["id"];

// Signal schema - raw pain detection from research
export const signalSchema = z.object({
  id: z.string(),
  personOrCompanyName: z.string(),
  role: z.string(),
  industry: z.string(),
  companySizeEstimate: z.string(),
  location: z.string(),
  painQuote: z.string(),
  painSummary: z.string(),
  sourceUrl: z.union([z.string().url(), z.literal("")]).optional(),
  dateDetected: z.string(),
  source: z.string().optional(),
  createdAt: z.string()
});

export const insertSignalSchema = signalSchema.omit({ id: true, createdAt: true });

export type Signal = z.infer<typeof signalSchema>;
export type InsertSignal = z.infer<typeof insertSignalSchema>;

// Scored Lead schema - signal + scoring + routing
export const scoredLeadSchema = z.object({
  id: z.string(),
  signalId: z.string(),
  personOrCompanyName: z.string(),
  role: z.string(),
  industry: z.string(),
  companySizeEstimate: z.string(),
  location: z.string(),
  painQuote: z.string(),
  painSummary: z.string(),
  sourceUrl: z.string().optional(),
  dateDetected: z.string(),
  // Scoring fields
  confidenceScore: z.number().min(1).max(5),
  hasCoordinationOverload: z.boolean(),
  hasTurnoverFragility: z.boolean(),
  hasInboundFriction: z.boolean(),
  hasRevenueProximity: z.boolean(),
  // Routing fields
  recommendedAIEmployee: z.string(),
  aiEmployeeName: z.string(),
  whyThisAIEmployee: z.string(),
  // Meta
  createdAt: z.string(),
  exportedToSheets: z.boolean()
});

export type ScoredLead = z.infer<typeof scoredLeadSchema>;

// Content Insight schema - for ContentLayerOS
export const insightSchema = z.object({
  id: z.string(),
  signalId: z.string(),
  insightTheme: z.enum(["coordination-pain", "turnover-fatigue", "inbound-friction"]),
  rawPainLanguage: z.string(),
  normalizedProblem: z.string(),
  operatorEmotion: z.string(),
  agentLayerOSAngle: z.string(),
  suggestedPostAngles: z.array(z.enum(["contrarian", "story", "lesson", "quiet-win"])),
  sourceType: z.string(),
  dateDetected: z.string(),
  createdAt: z.string()
});

export const insertInsightSchema = insightSchema.omit({ id: true, createdAt: true });

export type Insight = z.infer<typeof insightSchema>;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

// Weekly Content Run schema
export const contentRunSchema = z.object({
  id: z.string(),
  runDate: z.string(),
  insightIds: z.array(z.string()),
  linkedInDrafts: z.array(z.object({
    id: z.string(),
    content: z.string(),
    theme: z.string(),
    angle: z.string()
  })),
  xDrafts: z.array(z.object({
    id: z.string(),
    content: z.string(),
    theme: z.string(),
    angle: z.string()
  })),
  contexts: z.array(z.enum(["ICP", "Positioning", "Be Contrary"])),
  status: z.enum(["pending", "completed"]),
  createdAt: z.string()
});

export type ContentRun = z.infer<typeof contentRunSchema>;

// Stats summary
export const statsSchema = z.object({
  totalSignals: z.number(),
  totalLeads: z.number(),
  highIntentLeads: z.number(),
  contentInsights: z.number(),
  contentRuns: z.number()
});

export type Stats = z.infer<typeof statsSchema>;

// Bulk signal import schema
export const bulkSignalImportSchema = z.object({
  signals: z.array(insertSignalSchema)
});

export type BulkSignalImport = z.infer<typeof bulkSignalImportSchema>;

// Keep existing user types for compatibility
export const users = {
  id: "",
  username: "",
  password: ""
};

export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = {
  username: string;
  password: string;
};
