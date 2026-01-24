import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  ExternalLink,
  Download,
  Building2,
  MapPin,
  User,
  Check,
  CheckCircle,
  XCircle,
  Bot,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ScoredLead } from "@shared/schema";
import { AI_EMPLOYEES } from "@shared/schema";

function ScoreBadge({ score }: { score: number }) {
  const scoreClass = `score-${score}`;
  const labels: Record<number, string> = {
    5: "Obvious Buyer",
    4: "Strong Candidate",
    3: "Follow-Up",
    2: "Content Only",
    1: "Low Intent",
  };

  return (
    <Badge variant="outline" className={`${scoreClass} border`}>
      {score}/5 • {labels[score] || "Unknown"}
    </Badge>
  );
}

function ScoringIndicator({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
      )}
      <span
        className={`text-xs ${active ? "text-foreground" : "text-muted-foreground/60"}`}
      >
        {label}
      </span>
    </div>
  );
}

function LeadCard({ lead }: { lead: ScoredLead }) {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold">{lead.personOrCompanyName}</h3>
            <p className="text-sm text-muted-foreground">{lead.role}</p>
          </div>
          <ScoreBadge score={lead.confidenceScore} />
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            {lead.industry}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {lead.companySizeEstimate}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            {lead.location}
          </Badge>
        </div>

        <blockquote className="border-l-2 border-primary/30 pl-3 mb-3">
          <p className="text-sm italic text-muted-foreground line-clamp-2">
            "{lead.painQuote}"
          </p>
        </blockquote>

        <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-lg bg-muted/50">
          <ScoringIndicator
            label="Coordination"
            active={lead.hasCoordinationOverload}
          />
          <ScoringIndicator
            label="Turnover"
            active={lead.hasTurnoverFragility}
          />
          <ScoringIndicator
            label="Inbound Friction"
            active={lead.hasInboundFriction}
          />
          <ScoringIndicator
            label="Revenue Proximity"
            active={lead.hasRevenueProximity}
          />
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{lead.aiEmployeeName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lead.whyThisAIEmployee}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            {new Date(lead.dateDetected).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2">
            {lead.exportedToSheets && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Check className="h-3 w-3" />
                Exported
              </Badge>
            )}
            {lead.sourceUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [aiEmployeeFilter, setAiEmployeeFilter] = useState<string>("all");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<ScoredLead[]>({
    queryKey: ["/api/leads"],
  });

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const response = await apiRequest("POST", "/api/leads/export", { spreadsheetId: sheetId });
      return response;
    },
    onSuccess: (data: any) => {
      setExportDialogOpen(false);
      toast({
        title: "Export Complete",
        description: data.message || `${data.exportedCount} leads exported to Google Sheets.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Unable to export leads. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    if (scoreFilter !== "all" && lead.confidenceScore !== parseInt(scoreFilter)) {
      return false;
    }
    if (aiEmployeeFilter !== "all" && lead.recommendedAIEmployee !== aiEmployeeFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.personOrCompanyName.toLowerCase().includes(query) ||
      lead.role.toLowerCase().includes(query) ||
      lead.industry.toLowerCase().includes(query) ||
      lead.painQuote.toLowerCase().includes(query) ||
      lead.painSummary.toLowerCase().includes(query)
    );
  });

  const highIntentCount = leads?.filter((l) => l.confidenceScore >= 4).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">
            Scored and routed leads ready for outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {leads?.length ?? 0} total
          </Badge>
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {highIntentCount} high-intent
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-40" data-testid="select-score-filter">
            <SelectValue placeholder="All Scores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="5">Score 5</SelectItem>
            <SelectItem value="4">Score 4</SelectItem>
            <SelectItem value="3">Score 3</SelectItem>
            <SelectItem value="2">Score 2</SelectItem>
            <SelectItem value="1">Score 1</SelectItem>
          </SelectContent>
        </Select>
        <Select value={aiEmployeeFilter} onValueChange={setAiEmployeeFilter}>
          <SelectTrigger className="w-56" data-testid="select-employee-filter">
            <SelectValue placeholder="All AI Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All AI Employees</SelectItem>
            {AI_EMPLOYEES.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={!leads?.length}
              data-testid="button-export-leads"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Sheets
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export to Google Sheets</DialogTitle>
              <DialogDescription>
                Enter your Google Sheet ID to export leads. You can find the ID in your spreadsheet URL:
                <code className="block mt-2 p-2 bg-muted rounded text-xs break-all">
                  docs.google.com/spreadsheets/d/<strong>[SHEET_ID]</strong>/edit
                </code>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
                <Input
                  id="spreadsheet-id"
                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  data-testid="input-spreadsheet-id"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
                data-testid="button-cancel-export"
              >
                Cancel
              </Button>
              <Button
                onClick={() => exportMutation.mutate(spreadsheetId)}
                disabled={exportMutation.isPending || !spreadsheetId.trim()}
                data-testid="button-confirm-export"
              >
                {exportMutation.isPending ? "Exporting..." : "Export Leads"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads && filteredLeads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">No leads found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || scoreFilter !== "all" || aiEmployeeFilter !== "all"
                ? "No leads match your filters. Try different criteria."
                : "Signals are scored and routed automatically. Upload research data to get started."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
