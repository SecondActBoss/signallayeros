import { AI_EMPLOYEES } from "@shared/schema";
import type { Signal, ScoredLead, Insight } from "@shared/schema";

// Pain detection patterns
const COORDINATION_PATTERNS = [
  /follow.?up/i,
  /handoff/i,
  /depend/i,
  /everything.+me/i,
  /nothing.+moved/i,
  /busy.+all.+day/i,
  /coordination/i,
  /balls.+dropping/i,
  /falling.+through/i,
  /cracks/i,
  /bottleneck/i,
  /waiting.+on/i,
  /back.+and.+forth/i,
];

const TURNOVER_PATTERNS = [
  /turnover/i,
  /rehir/i,
  /quit/i,
  /ghost/i,
  /left/i,
  /lost.+role/i,
  /work.+stops/i,
  /people.+stop/i,
  /training.+new/i,
  /fragile/i,
  /single.+point/i,
  /only.+one.+who/i,
  /key.+person/i,
];

const INBOUND_PATTERNS = [
  /missed.+call/i,
  /voicemail/i,
  /slow.+respon/i,
  /after.+hours/i,
  /can't.+keep.+up/i,
  /phone.+all.+day/i,
  /incoming/i,
  /inbound/i,
  /response.+time/i,
  /delay/i,
  /wait/i,
];

const REVENUE_PATTERNS = [
  /lead/i,
  /deal/i,
  /pipeline/i,
  /sales/i,
  /revenue/i,
  /customer/i,
  /close/i,
  /won/i,
  /lost.+(deal|customer|lead)/i,
  /opportunity/i,
  /prospect/i,
  /conversion/i,
];

// AI Employee routing patterns
const ROUTING_PATTERNS: Record<string, RegExp[]> = {
  "inbound-revenue": [
    /missed.+call/i,
    /voicemail/i,
    /after.+hours/i,
    /can't.+answer/i,
    /phone.+rings/i,
    /unanswered/i,
  ],
  "appointment-reminder": [
    /no.?show/i,
    /cancel/i,
    /reschedule/i,
    /calendar/i,
    /appointment/i,
    /forgot/i,
    /didn't.+show/i,
  ],
  "lead-reactivation": [
    /dormant/i,
    /old.+lead/i,
    /crm.+rot/i,
    /paid.+lead/i,
    /not.+closed/i,
    /cold.+lead/i,
    /never.+followed/i,
    /sitting.+in/i,
  ],
  "outbound-prospector": [
    /outbound/i,
    /pipeline.+creation/i,
    /cold.+call/i,
    /prospecting/i,
    /finding.+leads/i,
    /generating.+leads/i,
  ],
  "email-automation": [
    /inbox/i,
    /email/i,
    /forgotten.+repl/i,
    /manual.+follow/i,
    /sending.+emails/i,
    /reply/i,
  ],
  "support-response": [
    /support/i,
    /customer.+complaint/i,
    /ticket/i,
    /response.+delay/i,
    /channel.+chaos/i,
    /omni.?channel/i,
    /help.+desk/i,
  ],
  "call-feedback": [
    /calls.+happening/i,
    /deals.+stalling/i,
    /review.+calls/i,
    /meddic/i,
    /call.+notes/i,
    /follow.+up.+after.+call/i,
  ],
  "marketing-coordinator": [
    /post/i,
    /marketing/i,
    /content/i,
    /social/i,
    /inconsistent/i,
    /founder.+doing.+marketing/i,
    /no.+time.+for.+marketing/i,
  ],
};

function matchPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function detectPainSignals(signal: Signal): {
  hasCoordinationOverload: boolean;
  hasTurnoverFragility: boolean;
  hasInboundFriction: boolean;
  hasRevenueProximity: boolean;
} {
  const text = `${signal.painQuote} ${signal.painSummary}`;
  
  return {
    hasCoordinationOverload: matchPatterns(text, COORDINATION_PATTERNS),
    hasTurnoverFragility: matchPatterns(text, TURNOVER_PATTERNS),
    hasInboundFriction: matchPatterns(text, INBOUND_PATTERNS),
    hasRevenueProximity: matchPatterns(text, REVENUE_PATTERNS),
  };
}

function calculateScore(painSignals: {
  hasCoordinationOverload: boolean;
  hasTurnoverFragility: boolean;
  hasInboundFriction: boolean;
  hasRevenueProximity: boolean;
}): number {
  // Base score of 2 for any qualified signal
  let score = 2;
  
  if (painSignals.hasCoordinationOverload) score += 1;
  if (painSignals.hasTurnoverFragility) score += 1;
  if (painSignals.hasInboundFriction) score += 1;
  if (painSignals.hasRevenueProximity) score += 1;
  
  // Clamp to 1-5
  return Math.min(5, Math.max(1, score));
}

function routeToAIEmployee(signal: Signal, painSignals: {
  hasCoordinationOverload: boolean;
  hasTurnoverFragility: boolean;
  hasInboundFriction: boolean;
  hasRevenueProximity: boolean;
}): { id: string; name: string; reason: string } {
  const text = `${signal.painQuote} ${signal.painSummary}`;
  
  // Score each AI Employee based on pattern matches
  const scores: { id: string; score: number; name: string; description: string }[] = [];
  
  for (const employee of AI_EMPLOYEES) {
    const patterns = ROUTING_PATTERNS[employee.id] || [];
    let score = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }
    
    // Boost score for revenue-impacting agents if revenue proximity detected
    if (painSignals.hasRevenueProximity && 
        ["inbound-revenue", "lead-reactivation", "outbound-prospector"].includes(employee.id)) {
      score += 2;
    }
    
    // Boost score for inbound agents if inbound friction detected
    if (painSignals.hasInboundFriction && 
        ["inbound-revenue", "support-response"].includes(employee.id)) {
      score += 1;
    }
    
    scores.push({ id: employee.id, score, name: employee.name, description: employee.description });
  }
  
  // Sort by score, prefer revenue-impacting agents (inbound > outbound)
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    
    // Tie-breakers
    const revenueAgents = ["inbound-revenue", "lead-reactivation", "outbound-prospector"];
    const aIsRevenue = revenueAgents.includes(a.id);
    const bIsRevenue = revenueAgents.includes(b.id);
    
    if (aIsRevenue && !bIsRevenue) return -1;
    if (!aIsRevenue && bIsRevenue) return 1;
    
    // Inbound beats outbound
    const inboundAgents = ["inbound-revenue", "support-response", "appointment-reminder"];
    const aIsInbound = inboundAgents.includes(a.id);
    const bIsInbound = inboundAgents.includes(b.id);
    
    if (aIsInbound && !bIsInbound) return -1;
    if (!aIsInbound && bIsInbound) return 1;
    
    return 0;
  });
  
  const best = scores[0];
  
  // Generate reason
  let reason = "";
  if (painSignals.hasInboundFriction && best.id === "inbound-revenue") {
    reason = "Captures inbound leads and handles missed calls 24/7, directly addressing revenue loss from response gaps.";
  } else if (painSignals.hasRevenueProximity && best.id === "lead-reactivation") {
    reason = "Reactivates dormant leads and closes the loop on paid leads sitting in CRM.";
  } else if (painSignals.hasCoordinationOverload && best.id === "email-automation") {
    reason = "Automates follow-up sequences, reducing manual coordination overhead.";
  } else if (painSignals.hasTurnoverFragility && best.id === "support-response") {
    reason = "Provides consistent support coverage independent of staffing changes.";
  } else {
    reason = `${best.description} Best match for the specific pain signals detected.`;
  }
  
  return { id: best.id, name: best.name, reason };
}

function determineInsightTheme(painSignals: {
  hasCoordinationOverload: boolean;
  hasTurnoverFragility: boolean;
  hasInboundFriction: boolean;
  hasRevenueProximity: boolean;
}): "coordination-pain" | "turnover-fatigue" | "inbound-friction" {
  // Priority: inbound-friction > turnover-fatigue > coordination-pain
  if (painSignals.hasInboundFriction) return "inbound-friction";
  if (painSignals.hasTurnoverFragility) return "turnover-fatigue";
  return "coordination-pain";
}

function extractOperatorEmotion(painQuote: string): string {
  const emotions: string[] = [];
  
  if (/exhaust|tired|drain/i.test(painQuote)) emotions.push("exhausted");
  if (/frustrat|annoyed|angry/i.test(painQuote)) emotions.push("frustrated");
  if (/overwhelm|buried|drown/i.test(painQuote)) emotions.push("overwhelmed");
  if (/stuck|trapped|can't/i.test(painQuote)) emotions.push("stuck");
  if (/alone|only.+one/i.test(painQuote)) emotions.push("isolated");
  if (/worry|anxious|stress/i.test(painQuote)) emotions.push("stressed");
  
  return emotions.length > 0 ? emotions.join(", ") : "frustrated";
}

function generateAgentLayerOSAngle(
  painSignals: {
    hasCoordinationOverload: boolean;
    hasTurnoverFragility: boolean;
    hasInboundFriction: boolean;
    hasRevenueProximity: boolean;
  },
  aiEmployee: string
): string {
  if (painSignals.hasInboundFriction) {
    return `AI Employee handles ${aiEmployee.toLowerCase()} work 24/7, so operators stop losing revenue to response gaps.`;
  }
  if (painSignals.hasTurnoverFragility) {
    return `AI Employee provides reliable ${aiEmployee.toLowerCase()} coverage that doesn't quit, call in sick, or need training.`;
  }
  if (painSignals.hasCoordinationOverload) {
    return `AI Employee handles ${aiEmployee.toLowerCase()} autonomously, removing the founder from the coordination loop.`;
  }
  return `AI Employee replaces the need to hire for ${aiEmployee.toLowerCase()} work.`;
}

function suggestPostAngles(
  painSignals: {
    hasCoordinationOverload: boolean;
    hasTurnoverFragility: boolean;
    hasInboundFriction: boolean;
    hasRevenueProximity: boolean;
  },
  emotion: string
): ("contrarian" | "story" | "lesson" | "quiet-win")[] {
  const angles: ("contrarian" | "story" | "lesson" | "quiet-win")[] = [];
  
  // Contrarian for strong emotional signals
  if (/exhaust|overwhelm|frustrat/i.test(emotion)) {
    angles.push("contrarian");
  }
  
  // Story for specific pain patterns
  if (painSignals.hasCoordinationOverload || painSignals.hasTurnoverFragility) {
    angles.push("story");
  }
  
  // Lesson for clear problems
  if (painSignals.hasInboundFriction || painSignals.hasRevenueProximity) {
    angles.push("lesson");
  }
  
  // Quiet win for subtle improvements
  angles.push("quiet-win");
  
  return angles.slice(0, 4);
}

export function scoreAndRouteSignal(signal: Signal): Omit<ScoredLead, "id" | "createdAt"> {
  const painSignals = detectPainSignals(signal);
  const score = calculateScore(painSignals);
  const routing = routeToAIEmployee(signal, painSignals);
  
  return {
    signalId: signal.id,
    personOrCompanyName: signal.personOrCompanyName,
    role: signal.role,
    industry: signal.industry,
    companySizeEstimate: signal.companySizeEstimate,
    location: signal.location,
    painQuote: signal.painQuote,
    painSummary: signal.painSummary,
    sourceUrl: signal.sourceUrl,
    dateDetected: signal.dateDetected,
    confidenceScore: score,
    ...painSignals,
    recommendedAIEmployee: routing.id,
    aiEmployeeName: routing.name,
    whyThisAIEmployee: routing.reason,
    exportedToSheets: false,
  };
}

export function generateInsight(signal: Signal, lead: ScoredLead): Omit<Insight, "id" | "createdAt"> {
  const painSignals = {
    hasCoordinationOverload: lead.hasCoordinationOverload,
    hasTurnoverFragility: lead.hasTurnoverFragility,
    hasInboundFriction: lead.hasInboundFriction,
    hasRevenueProximity: lead.hasRevenueProximity,
  };
  
  const theme = determineInsightTheme(painSignals);
  const emotion = extractOperatorEmotion(signal.painQuote);
  const angle = generateAgentLayerOSAngle(painSignals, lead.aiEmployeeName);
  const postAngles = suggestPostAngles(painSignals, emotion);
  
  return {
    signalId: signal.id,
    insightTheme: theme,
    rawPainLanguage: signal.painQuote,
    normalizedProblem: signal.painSummary,
    operatorEmotion: emotion,
    agentLayerOSAngle: angle,
    suggestedPostAngles: postAngles,
    sourceType: signal.sourceUrl ? "web" : "manual",
    dateDetected: signal.dateDetected,
  };
}

export function generateContentDrafts(
  insights: Insight[],
  contexts: ("ICP" | "Positioning" | "Be Contrary")[]
): {
  linkedInDrafts: { id: string; content: string; theme: string; angle: string }[];
  xDrafts: { id: string; content: string; theme: string; angle: string }[];
} {
  const linkedInDrafts: { id: string; content: string; theme: string; angle: string }[] = [];
  const xDrafts: { id: string; content: string; theme: string; angle: string }[] = [];
  
  // Group insights by theme
  const byTheme: Record<string, Insight[]> = {};
  for (const insight of insights) {
    if (!byTheme[insight.insightTheme]) {
      byTheme[insight.insightTheme] = [];
    }
    byTheme[insight.insightTheme].push(insight);
  }
  
  // Generate LinkedIn drafts (2)
  let linkedInCount = 0;
  for (const [theme, themeInsights] of Object.entries(byTheme)) {
    if (linkedInCount >= 2) break;
    
    const insight = themeInsights[0];
    const beContrary = contexts.includes("Be Contrary");
    
    let content = "";
    let angle = insight.suggestedPostAngles[0] || "story";
    
    if (beContrary && angle !== "contrarian") {
      angle = "contrarian";
    }
    
    if (angle === "contrarian") {
      content = `The hard truth most operators won't admit:\n\n"${insight.rawPainLanguage}"\n\nYou don't need another hire.\nYou need work that runs without you.\n\nThe fix isn't more people.\nIt's removing yourself from the loop.`;
    } else if (angle === "story") {
      content = `Real talk from an operator:\n\n"${insight.rawPainLanguage}"\n\nThis isn't about AI.\nIt's about ${insight.operatorEmotion} operators who can't scale past themselves.\n\n${insight.agentLayerOSAngle}`;
    } else if (angle === "lesson") {
      content = `Pattern I keep seeing:\n\n${insight.normalizedProblem}\n\nThe symptom: "${insight.rawPainLanguage}"\n\nThe lesson: Relief comes from removing dependency, not adding capacity.`;
    } else {
      content = `Quiet win for operators:\n\n${insight.normalizedProblem}\n\n${insight.agentLayerOSAngle}\n\nNo hype. Just work that happens.`;
    }
    
    linkedInDrafts.push({
      id: `li-${Date.now()}-${linkedInCount}`,
      content,
      theme,
      angle,
    });
    linkedInCount++;
  }
  
  // Generate X drafts (2)
  let xCount = 0;
  for (const [theme, themeInsights] of Object.entries(byTheme)) {
    if (xCount >= 2) break;
    
    const insight = themeInsights[themeInsights.length > 1 ? 1 : 0];
    let angle = insight.suggestedPostAngles[1] || insight.suggestedPostAngles[0] || "lesson";
    
    let content = "";
    
    if (angle === "contrarian") {
      content = `Operators don't need more hires.\n\nThey need work that runs without them.\n\n"${insight.rawPainLanguage.slice(0, 80)}..."`;
    } else if (angle === "story") {
      content = `"${insight.rawPainLanguage.slice(0, 100)}..."\n\nThis is what ${insight.operatorEmotion} looks like.`;
    } else if (angle === "lesson") {
      content = `Pattern:\n${insight.normalizedProblem}\n\nFix:\n${insight.agentLayerOSAngle.slice(0, 80)}`;
    } else {
      content = `Quiet win:\n\n${insight.normalizedProblem}\n\nNo hype. Just relief.`;
    }
    
    xDrafts.push({
      id: `x-${Date.now()}-${xCount}`,
      content,
      theme,
      angle,
    });
    xCount++;
  }
  
  return { linkedInDrafts, xDrafts };
}
