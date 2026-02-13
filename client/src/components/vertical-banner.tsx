import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Lock,
  Unlock,
  RefreshCw,
  Bot,
  Calendar,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { FocusedVertical } from "@shared/schema";

type FocusResponse = {
  focusedVertical: FocusedVertical | null;
};

export function VerticalBanner() {
  const queryClient = useQueryClient();

  const { data: focusData, isLoading } = useQuery<FocusResponse>({
    queryKey: ["/api/verticals/focus"],
    refetchInterval: 30000,
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

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verticals/unlock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/density"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verticals/focus", { industry: null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/density"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verticals/weekly-focus"] });
    },
  });

  if (isLoading) return null;

  const vertical = focusData?.focusedVertical;

  if (!vertical) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/50 text-xs text-muted-foreground"
        data-testid="vertical-banner-empty"
      >
        <AlertTriangle className="h-3 w-3" />
        <span>No vertical focus yet. Ingest signals to activate.</span>
      </div>
    );
  }

  const isLocked = vertical.locked;
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2 border-b ${
        isLocked
          ? "bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-red-500/30"
          : "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30"
      }`}
      data-testid="vertical-banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Target className={`h-4 w-4 flex-shrink-0 ${isLocked ? "text-red-400" : "text-primary"}`} />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate" data-testid="banner-industry">
            {isLocked ? "DEPLOYING" : "Weekly Focus"}: {vertical.industry}
          </span>
          {isLocked && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] gap-1 flex-shrink-0">
              <Lock className="h-2.5 w-2.5" />
              LOCKED
            </Badge>
          )}
        </div>
        <span className="hidden sm:inline text-xs text-muted-foreground flex-shrink-0">|</span>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
          <Bot className="h-3 w-3" />
          <span data-testid="banner-ai-employee">{vertical.primaryAIEmployee}</span>
        </div>
        <span className="hidden md:inline text-xs text-muted-foreground flex-shrink-0">|</span>
        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Calendar className="h-3 w-3" />
          <span>{new Date(vertical.selectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
        {isLocked && vertical.lockedUntil && (
          <>
            <span className="hidden lg:inline text-xs text-muted-foreground flex-shrink-0">|</span>
            <span className="hidden lg:inline text-[10px] text-red-400 flex-shrink-0">
              Until {new Date(vertical.lockedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 text-xs gap-1 ${isLocked ? "text-red-400 hover:text-red-300" : ""}`}
          onClick={() => isLocked ? unlockMutation.mutate() : lockMutation.mutate()}
          disabled={lockPending}
          data-testid="button-toggle-lock"
        >
          {lockPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isLocked ? (
            <Unlock className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {isLocked ? "Unlock" : "Lock"}
        </Button>
        {!isLocked && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            data-testid="button-change-focus"
          >
            {clearMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Change
          </Button>
        )}
      </div>
    </div>
  );
}
