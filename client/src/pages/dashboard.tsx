import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radio,
  Users,
  TrendingUp,
  FileText,
  Calendar,
  ArrowUpRight,
  Zap,
  BarChart3,
  Flame,
  Target,
  ArrowUp,
  X,
  Crown,
  Bot,
  BookOpen,
  Quote,
  Sparkles,
  Download,
  Loader2,
  Lock,
  Shield,
  Crosshair,
  Mail,
  Linkedin,
  MessageSquare,
  Presentation,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Stats, ScoredLead, Signal, FocusedVertical } from "@shared/schema";

type FocusResponse = {
  focusedVertical: FocusedVertical | null;
};

type VerticalRank = {
  industry: string;
  totalLeads: number;
  totalPainScore: number;
  avgPainScore: number;
  countScore5: number;
  countScore4Plus: number;
  dominantPainSignal: string;
};

type VerticalCluster = {
  industry: string;
  leadsLast14Days: number;
  growthRate: number;
  avgScore: number;
  score5Count: number;
  clusterStrength: "High" | "Medium" | "Emerging";
};

type WeeklyFocus = {
  industry: string;
  reasonSelected: string;
  dominantPainSignal: string;
  primaryAIAgentDemand: string;
  topPainQuotes: string[];
  suggestedBlueprintTitle: string;
  suggestedContentAngles: string[];
  totalLeads: number;
  avgScore: number;
  growthRate: number;
  generatedAt: string;
};

type VerticalDensity = {
  industry: string;
  totalSignals: number;
  totalLeads: number;
  avgPainScore: number;
  growthRate7d: number;
  signalShare: number;
  clusterStrength: "Weak" | "Forming" | "Dominant";
  breakoutDetected: boolean;
  dominantPainSignal: string;
  primaryAIEmployee: string;
  topPainQuotes: string[];
  strategy: {
    leadMagnet: string;
    coldEmailHook: string;
    linkedInHook: string;
    demoFraming: string;
  };
  locked: boolean;
  lockedUntil: string | null;
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: string;
}) {
  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {trend && (
            <span className="flex items-center text-xs text-emerald-500">
              <ArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function painSignalColor(signal: string): string {
  switch (signal) {
    case "Coordination Overload": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Turnover Fragility": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    case "Inbound Friction": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Revenue Proximity": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function clusterStrengthStyle(strength: string): string {
  switch (strength) {
    case "Dominant": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Forming": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Weak": return "bg-muted text-muted-foreground border-border";
    case "High": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Emerging": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function VerticalDominancePanel() {
  const queryClient = useQueryClient();

  const { data: density, isLoading: densityLoading } = useQuery<VerticalDensity | null>({
    queryKey: ["/api/verticals/density"],
  });

  const { data: focus, isLoading: focusLoading } = useQuery<WeeklyFocus | null>({
    queryKey: ["/api/verticals/weekly-focus"],
  });

  const { data: focusData } = useQuery<FocusResponse>({
    queryKey: ["/api/verticals/focus"],
  });

  const focusedVertical = focusData?.focusedVertical;

  const setFocusMutation = useMutation({
    mutationFn: async (focusObj: any) => {
      const res = await apiRequest("POST", "/api/verticals/focus", focusObj);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/density"] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verticals/lock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/density"] });
    },
  });

  const contentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/content-runs/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-runs"] });
    },
  });

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const res = await apiRequest("POST", "/api/leads/export", { spreadsheetId: sheetId });
      return res.json();
    },
    onSuccess: () => {
      setExportDialogOpen(false);
      setSpreadsheetId("");
    },
  });

  const isLoading = densityLoading || focusLoading;

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!focus && !focusedVertical) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Crosshair className="h-16 w-16 text-muted-foreground/15 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground" data-testid="text-no-vertical">
            No vertical focus yet. Ingest signals to activate.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md">
            SignalLayerOS needs signal data to select a vertical. Once signals are ingested, the engine will automatically identify your highest-leverage vertical for conquest.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activateVertical = () => {
    if (focus) {
      setFocusMutation.mutate({
        industry: focus.industry,
        reason: focus.reasonSelected,
        primaryAIEmployee: focus.primaryAIAgentDemand,
        dominantPainSignal: focus.dominantPainSignal,
        totalLeads: focus.totalLeads,
        avgScore: focus.avgScore,
        growthRate: focus.growthRate,
      });
    }
  };

  if (focus && !focusedVertical) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" data-testid="weekly-focus-panel">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Recommended Vertical</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-focus-industry">
              Deploying: {focus.industry} — {focus.totalLeads} signals, avg score {focus.avgScore}, +{Math.round(focus.growthRate * 100)}% growth
            </h2>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-focus-reason">{focus.reasonSelected}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-xs ${painSignalColor(focus.dominantPainSignal)}`}>
              {focus.dominantPainSignal}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm">
              <Bot className="h-4 w-4 text-primary" />
              <span data-testid="text-focus-ai-agent">{focus.primaryAIAgentDemand}</span>
            </div>
          </div>
          <Button onClick={activateVertical} disabled={setFocusMutation.isPending} data-testid="button-activate-vertical">
            <Target className="h-4 w-4 mr-2" />
            {setFocusMutation.isPending ? "Activating..." : "Activate This Vertical"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const d = density;
  const isLocked = d?.locked || focusedVertical?.locked;

  return (
    <div className="space-y-6" data-testid="vertical-dominance-panel">
      <Card className={`border-2 ${isLocked ? "border-red-500/40 bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5" : "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${isLocked ? "text-red-400" : "text-primary"}`} />
            <CardTitle className="text-base font-semibold">Vertical Dominance</CardTitle>
            {isLocked && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs gap-1">
                <Lock className="h-3 w-3" />
                DOMINATION MODE
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-active-vertical">
              {isLocked ? "DEPLOYING" : "Targeting"}: {focusedVertical?.industry}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{focusedVertical?.reason}</p>
          </div>

          {d && (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-2xl font-bold" data-testid="text-density-signals">{d.totalSignals}</p>
                  <p className="text-xs text-muted-foreground">Signals</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-2xl font-bold" data-testid="text-density-avg">{d.avgPainScore}</p>
                  <p className="text-xs text-muted-foreground">Avg Pain</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className={`text-2xl font-bold ${d.growthRate7d > 0 ? "text-emerald-500" : ""}`}>
                    {d.growthRate7d > 0 ? "+" : ""}{Math.round(d.growthRate7d * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Growth 7d</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-2xl font-bold" data-testid="text-density-share">{d.signalShare}%</p>
                  <p className="text-xs text-muted-foreground">Signal Share</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <Badge variant="outline" className={`text-xs ${clusterStrengthStyle(d.clusterStrength)}`} data-testid="badge-cluster-strength">
                    {d.clusterStrength}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Cluster</p>
                </div>
              </div>

              {d.breakoutDetected && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <Flame className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-semibold text-red-400" data-testid="text-breakout">
                    Vertical Breakout Detected — {d.signalShare}% signal dominance
                  </span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Primary AI Employee Demand</span>
                  </div>
                  <p className="text-sm font-semibold" data-testid="text-density-ai">{d.primaryAIEmployee}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Dominant Pain Signal</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${painSignalColor(d.dominantPainSignal)}`}>
                    {d.dominantPainSignal}
                  </Badge>
                </div>
              </div>

              {d.topPainQuotes.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Quote className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Top Pain Quotes</span>
                  </div>
                  <div className="space-y-2">
                    {d.topPainQuotes.map((quote, idx) => (
                      <p key={idx} className="text-sm italic text-muted-foreground pl-3 border-l-2 border-primary/30" data-testid={`text-pain-quote-${idx}`}>
                        "{quote}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {!isLocked && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => lockMutation.mutate()}
                disabled={lockMutation.isPending}
                data-testid="button-commit-vertical"
              >
                {lockMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Commit to This Vertical
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => contentMutation.mutate()}
              disabled={contentMutation.isPending}
              data-testid="button-generate-content"
            >
              {contentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Content
            </Button>
            {!exportDialogOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                data-testid="button-export-leads"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Operator Targets
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Google Sheet ID"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="h-8 px-2 text-xs rounded border border-border bg-background w-48"
                  data-testid="input-export-sheet-id"
                />
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs"
                  onClick={() => exportMutation.mutate(spreadsheetId)}
                  disabled={!spreadsheetId || exportMutation.isPending}
                  data-testid="button-export-confirm"
                >
                  {exportMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Export"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => { setExportDialogOpen(false); setSpreadsheetId(""); }}
                  data-testid="button-export-cancel"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {contentMutation.isSuccess && (
            <p className="text-xs text-emerald-500" data-testid="text-content-success">
              Content generated with {focusedVertical?.industry} vertical focus. Check the Content page for drafts.
            </p>
          )}
        </CardContent>
      </Card>

      {d?.strategy && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Vertical Strategy Output</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Crosshair className="h-3 w-3 mr-1" />
                {focusedVertical?.industry}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Lead Magnet Title</span>
                </div>
                <p className="text-sm font-semibold" data-testid="text-strategy-leadmagnet">{d.strategy.leadMagnet}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Cold Email Hook</span>
                </div>
                <p className="text-sm" data-testid="text-strategy-email">{d.strategy.coldEmailHook}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Linkedin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">LinkedIn Post Hook</span>
                </div>
                <p className="text-sm" data-testid="text-strategy-linkedin">{d.strategy.linkedInHook}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Presentation className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Demo Framing</span>
                </div>
                <p className="text-sm" data-testid="text-strategy-demo">{d.strategy.demoFraming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecentLeadRow({ lead }: { lead: ScoredLead }) {
  const scoreClass = `score-${lead.confidenceScore}`;
  
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{lead.personOrCompanyName}</span>
          <Badge variant="outline" className={`text-xs ${scoreClass}`}>
            {lead.confidenceScore}/5
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {lead.role} • {lead.industry}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <Badge variant="secondary" className="text-xs">
          {lead.aiEmployeeName.split(" ")[0]}
        </Badge>
      </div>
    </div>
  );
}

function RecentSignalRow({ signal }: { signal: Signal }) {
  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">{signal.personOrCompanyName}</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{signal.role}</span>
      </div>
      <p className="text-sm text-muted-foreground italic line-clamp-2">
        "{signal.painQuote}"
      </p>
    </div>
  );
}

function ClusterRadarPanel() {
  const queryClient = useQueryClient();

  const { data: clusters, isLoading } = useQuery<VerticalCluster[]>({
    queryKey: ["/api/verticals/clusters"],
  });

  const { data: focusData } = useQuery<FocusResponse>({
    queryKey: ["/api/verticals/focus"],
  });

  const focusMutation = useMutation({
    mutationFn: async (industry: string | null) => {
      await apiRequest("POST", "/api/verticals/focus", { industry });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/density"] });
    },
  });

  const focusedVertical = focusData?.focusedVertical ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Cluster Radar</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Detection
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : clusters && clusters.length > 0 ? (
          <div className="space-y-3">
            {clusters.map((c) => (
              <div
                key={c.industry}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                data-testid={`cluster-row-${c.industry}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-emerald-500 flex-shrink-0">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {c.growthRate > 0 ? "+" : ""}{Math.round(c.growthRate * 100)}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-sm truncate block">{c.industry}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.leadsLast14Days} leads · avg {c.avgScore} · {c.score5Count} score-5
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={`text-xs ${clusterStrengthStyle(c.clusterStrength)}`}>
                    {c.clusterStrength}
                  </Badge>
                  <Button
                    variant={focusedVertical?.industry === c.industry ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => focusMutation.mutate(focusedVertical?.industry === c.industry ? null : c.industry)}
                    disabled={focusMutation.isPending}
                    data-testid={`button-focus-${c.industry}`}
                  >
                    {focusedVertical?.industry === c.industry ? "Focused" : "Focus"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No clusters detected yet</p>
            <p className="text-xs text-muted-foreground/70">
              Clusters form when an industry has 5+ leads, avg score 3.5+, and 50%+ growth in 14 days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VerticalDominationPanel() {
  const [timeRange, setTimeRange] = useState<string>("all");

  const { data: verticals, isLoading } = useQuery<VerticalRank[]>({
    queryKey: ["/api/verticals/rank", timeRange],
    queryFn: async () => {
      const params = timeRange !== "all" ? `?range=${timeRange}` : "";
      const res = await fetch(`/api/verticals/rank${params}`);
      if (!res.ok) throw new Error("Failed to fetch verticals");
      return res.json();
    },
  });

  const maxPainScore = verticals?.length ? Math.max(...verticals.map((v) => v.totalPainScore)) : 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Vertical Domination</CardTitle>
          <Badge variant="outline" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            {verticals?.length ?? 0} Industries
          </Badge>
        </div>
        <div className="flex gap-1">
          {[
            { label: "7d", value: "7d" },
            { label: "30d", value: "30d" },
            { label: "All", value: "all" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={timeRange === opt.value ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setTimeRange(opt.value)}
              data-testid={`button-range-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : verticals && verticals.length > 0 ? (
          <div className="space-y-3">
            {verticals.map((v, idx) => (
              <div key={v.industry} className="space-y-1.5" data-testid={`vertical-row-${idx}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm truncate">{v.industry}</span>
                    {v.countScore5 > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 flex-shrink-0 border-orange-500/30 text-orange-400">
                        <Flame className="h-3 w-3" />
                        {v.countScore5}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${painSignalColor(v.dominantPainSignal)}`}>
                      {v.dominantPainSignal}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {v.totalLeads} lead{v.totalLeads !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                      style={{ width: `${(v.totalPainScore / maxPainScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{v.totalPainScore}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No vertical data yet</p>
            <p className="text-xs text-muted-foreground/70">
              Ingest signals to see industry rankings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery<ScoredLead[]>({
    queryKey: ["/api/leads", "recent"],
  });

  const { data: recentSignals, isLoading: signalsLoading } = useQuery<Signal[]>({
    queryKey: ["/api/signals", "recent"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground text-sm">
            Vertical conquest machine — focus, dominate, deploy
          </p>
        </div>
      </div>

      <VerticalDominancePanel />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Pain Signals"
              value={stats?.totalSignals ?? 0}
              icon={Radio}
              description="Detected signals"
            />
            <StatCard
              title="Operator Targets"
              value={stats?.totalLeads ?? 0}
              icon={Users}
              description="Scored leads"
            />
            <StatCard
              title="High-Intent"
              value={stats?.highIntentLeads ?? 0}
              icon={TrendingUp}
              description="Score 4-5"
            />
            <StatCard
              title="Insights"
              value={stats?.contentInsights ?? 0}
              icon={FileText}
              description="Content inputs"
            />
            <StatCard
              title="Content Runs"
              value={stats?.contentRuns ?? 0}
              icon={Calendar}
              description="Weekly batches"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VerticalDominationPanel />
        <ClusterRadarPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Operator Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <RecentLeadRow key={lead.id} lead={lead} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No leads yet. Ingest signals to start scoring.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Pain Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="py-3">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : recentSignals && recentSignals.length > 0 ? (
              recentSignals.map((signal) => (
                <RecentSignalRow key={signal.id} signal={signal} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No signals yet. Upload research data from the Ingest page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
