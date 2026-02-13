import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useState } from "react";
import type { Stats, ScoredLead, Signal } from "@shared/schema";

type VerticalRank = {
  industry: string;
  totalLeads: number;
  totalPainScore: number;
  avgPainScore: number;
  countScore5: number;
  countScore4Plus: number;
  dominantPainSignal: string;
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

function painSignalColor(signal: string): string {
  switch (signal) {
    case "Coordination Overload": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Turnover Fragility": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    case "Inbound Friction": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Revenue Proximity": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function VerticalIntelligencePanel() {
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
          <CardTitle className="text-base font-semibold">Vertical Intelligence</CardTitle>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            GTM intelligence overview for AgentLayerOS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Signals"
              value={stats?.totalSignals ?? 0}
              icon={Radio}
              description="Pain signals detected"
            />
            <StatCard
              title="Qualified Leads"
              value={stats?.totalLeads ?? 0}
              icon={Users}
              description="Scored and routed"
            />
            <StatCard
              title="High-Intent"
              value={stats?.highIntentLeads ?? 0}
              icon={TrendingUp}
              description="Score 4-5 leads"
            />
            <StatCard
              title="Content Insights"
              value={stats?.contentInsights ?? 0}
              icon={FileText}
              description="For ContentLayerOS"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Scored
            </Badge>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentLeads && recentLeads.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentLeads.slice(0, 5).map((lead) => (
                  <RecentLeadRow key={lead.id} lead={lead} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No leads yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Ingest signals to start scoring
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Recent Signals</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Radio className="h-3 w-3 mr-1" />
              Detected
            </Badge>
          </CardHeader>
          <CardContent>
            {signalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-2">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : recentSignals && recentSignals.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentSignals.slice(0, 4).map((signal) => (
                  <RecentSignalRow key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Radio className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No signals yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Upload research data to detect pain signals
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <VerticalIntelligencePanel />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">System Workflow</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            3 Stages
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-medium text-sm">Signal Detection</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ICP-qualified pain discovery from research sources. Looks for coordination + turnover pain, not AI interest.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-medium text-sm">Lead Scoring + Routing</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Score leads 1-5 based on pain signals. Route to the best AI Employee for their specific problem.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-medium text-sm">Dual Output</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Export to Google Sheets for outreach. Generate weekly content inputs for ContentLayerOS.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
