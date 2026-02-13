import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Lightbulb,
  MessageSquare,
  Twitter,
  Linkedin,
  Play,
  Sparkles,
  Calendar,
  RefreshCw,
  Target,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Insight, ContentRun } from "@shared/schema";
import type { FocusedVertical } from "@shared/schema";

type FocusResponse = {
  focusedVertical: FocusedVertical | null;
};

const themeLabels: Record<string, { label: string; color: string }> = {
  "coordination-pain": { label: "Coordination Pain", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "turnover-fatigue": { label: "Turnover Fatigue", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "inbound-friction": { label: "Inbound Friction", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const angleLabels: Record<string, string> = {
  "contrarian": "Contrarian",
  "story": "Story",
  "lesson": "Lesson",
  "quiet-win": "Quiet Win",
};

function InsightCard({ insight }: { insight: Insight }) {
  const theme = themeLabels[insight.insightTheme] || { label: insight.insightTheme, color: "" };

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <Badge variant="outline" className={`text-xs ${theme.color}`}>
            {theme.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(insight.dateDetected).toLocaleDateString()}
          </span>
        </div>

        <h3 className="font-medium text-sm mb-2">{insight.normalizedProblem}</h3>

        <blockquote className="border-l-2 border-primary/30 pl-3 mb-3">
          <p className="text-sm italic text-muted-foreground">
            "{insight.rawPainLanguage}"
          </p>
        </blockquote>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Emotion:</span>
            <span className="text-sm">{insight.operatorEmotion}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Angle:</span>
            <span className="text-sm">{insight.agentLayerOSAngle}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {insight.suggestedPostAngles.map((angle) => (
            <Badge key={angle} variant="secondary" className="text-xs">
              {angleLabels[angle] || angle}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContentDraft({
  platform,
  draft,
}: {
  platform: "linkedin" | "twitter";
  draft: { id: string; content: string; theme: string; angle: string };
}) {
  const Icon = platform === "linkedin" ? Linkedin : Twitter;
  const platformLabel = platform === "linkedin" ? "LinkedIn" : "X (Twitter)";
  const theme = themeLabels[draft.theme] || { label: draft.theme, color: "" };

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{platformLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${theme.color}`}>
              {theme.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {angleLabels[draft.angle] || draft.angle}
            </Badge>
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.content}</p>
      </CardContent>
    </Card>
  );
}

function ContentRunCard({ run }: { run: ContentRun }) {
  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">
            Week of {new Date(run.runDate).toLocaleDateString()}
          </CardTitle>
          <Badge
            variant={run.status === "completed" ? "default" : "secondary"}
            className="text-xs"
          >
            {run.status === "completed" ? "Completed" : "Pending"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {run.insightIds.length} insights
          </Badge>
          {run.contexts.map((ctx) => (
            <Badge key={ctx} variant="secondary" className="text-xs">
              {ctx}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn Drafts
          </h4>
          <div className="space-y-3">
            {run.linkedInDrafts.map((draft) => (
              <ContentDraft key={draft.id} platform="linkedin" draft={draft} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Twitter className="h-4 w-4" />
            X (Twitter) Drafts
          </h4>
          <div className="space-y-3">
            {run.xDrafts.map((draft) => (
              <ContentDraft key={draft.id} platform="twitter" draft={draft} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Content() {
  const { toast } = useToast();

  const { data: insights, isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
  });

  const { data: contentRuns, isLoading: runsLoading } = useQuery<ContentRun[]>({
    queryKey: ["/api/content-runs"],
  });

  const { data: focusData } = useQuery<FocusResponse>({
    queryKey: ["/api/verticals/focus"],
  });

  const focusedVertical = focusData?.focusedVertical;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (focusedVertical) {
        await apiRequest("POST", "/api/verticals/focus", {
          industry: focusedVertical.industry,
          reason: focusedVertical.reason,
          primaryAIEmployee: focusedVertical.primaryAIEmployee,
        });
      }
      const response = await apiRequest("POST", "/api/content-runs/generate");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Content Generated",
        description: focusedVertical
          ? `Weekly content generated for ${focusedVertical.industry} vertical.`
          : "Weekly content drafts have been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-runs"] });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate content. Make sure you have insights first.",
        variant: "destructive",
      });
    },
  });

  const insightsByTheme = {
    "coordination-pain": insights?.filter((i) => i.insightTheme === "coordination-pain") ?? [],
    "turnover-fatigue": insights?.filter((i) => i.insightTheme === "turnover-fatigue") ?? [],
    "inbound-friction": insights?.filter((i) => i.insightTheme === "inbound-friction") ?? [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground text-sm">
            Content insights and weekly drafts for ContentLayerOS
          </p>
        </div>
        <div className="flex items-center gap-2">
          {focusedVertical && (
            <Badge className="gap-1.5 text-xs bg-primary/20 text-primary border-primary/30" data-testid="badge-content-vertical">
              <Target className="h-3 w-3" />
              {focusedVertical.industry}
              {focusedVertical.locked && <Lock className="h-3 w-3" />}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Lightbulb className="h-3 w-3" />
            {insights?.length ?? 0} insights
          </Badge>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !insights?.length}
            data-testid="button-generate-content"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {focusedVertical
              ? `Generate for ${focusedVertical.industry}`
              : "Generate Weekly Content"}
          </Button>
        </div>
      </div>

      {focusedVertical && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Vertical Lock Active:</strong> Content generation is locked to <strong>{focusedVertical.industry}</strong> operators.
            All drafts will use real pain quotes from this vertical. Generic SMB language is excluded.
            {focusedVertical.locked && " System is in vertical domination mode."}
          </p>
        </div>
      )}

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights" className="gap-2" data-testid="tab-insights">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2" data-testid="tab-runs">
            <Calendar className="h-4 w-4" />
            Weekly Runs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {insightsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(insightsByTheme).map(([theme, themeInsights]) => {
                if (themeInsights.length === 0) return null;
                const themeInfo = themeLabels[theme];
                return (
                  <div key={theme}>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className={`${themeInfo.color}`}>
                        {themeInfo.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {themeInsights.length} insight{themeInsights.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {themeInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-1">No insights yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Insights are generated from scored leads. Upload and process signals to create content insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          {runsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contentRuns && contentRuns.length > 0 ? (
            <div className="space-y-6">
              {contentRuns.map((run) => (
                <ContentRunCard key={run.id} run={run} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-1">No content runs yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Click "Generate Weekly Content" to create LinkedIn and X drafts from your insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
