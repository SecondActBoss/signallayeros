import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  ExternalLink,
  Download,
  Building2,
  MapPin,
  User,
  Upload,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Mail,
  Linkedin,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Prospect, FocusedVertical } from "@shared/schema";
import { PROSPECT_STATUSES } from "@shared/schema";

type FocusResponse = {
  focusedVertical: FocusedVertical | null;
};

const STATUS_COLORS: Record<string, string> = {
  "Not Contacted": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Contacted": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Replied": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Demo Booked": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Closed": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(prospect.notes || "");
  const [copied, setCopied] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/prospects/${prospect.id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("PATCH", `/api/prospects/${prospect.id}`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({ title: "Notes saved" });
    },
  });

  const copyEmail = () => {
    navigator.clipboard.writeText(prospect.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      className="border-border/50 hover:border-border/80 transition-colors"
      data-testid={`card-prospect-${prospect.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-company-${prospect.id}`}>
              {prospect.companyName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate" data-testid={`text-owner-${prospect.id}`}>{prospect.ownerName}</span>
            </div>
          </div>
          <Select
            value={prospect.status}
            onValueChange={(val) => statusMutation.mutate(val)}
          >
            <SelectTrigger
              className={`h-7 w-auto text-[11px] border ${STATUS_COLORS[prospect.status] || ""} px-2 gap-1`}
              data-testid={`select-status-${prospect.id}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{prospect.industry}</span>
          </div>
          {prospect.companySizeEstimate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.companySizeEstimate}</span>
            </div>
          )}
          {prospect.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={copyEmail}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors cursor-pointer"
            data-testid={`button-copy-email-${prospect.id}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <Mail className="h-3 w-3" />
            <span className="truncate max-w-[180px]">{prospect.email}</span>
          </button>
          {prospect.phone && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {prospect.phone}
            </span>
          )}
          {prospect.website && (
            <a
              href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              data-testid={`link-website-${prospect.id}`}
            >
              <Globe className="h-3 w-3" />
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {prospect.linkedinUrl && (
            <a
              href={prospect.linkedinUrl.startsWith("http") ? prospect.linkedinUrl : `https://${prospect.linkedinUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              data-testid={`link-linkedin-${prospect.id}`}
            >
              <Linkedin className="h-3 w-3" />
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-border/50">
            {prospect.source}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80">
            {prospect.verticalTag}
          </Badge>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          data-testid={`button-expand-notes-${prospect.id}`}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Notes
        </button>

        {expanded && (
          <div className="space-y-2">
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add notes..."
              className="text-xs min-h-[60px] resize-none"
              data-testid={`textarea-notes-${prospect.id}`}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              onClick={() => notesMutation.mutate(localNotes)}
              disabled={notesMutation.isPending}
              data-testid={`button-save-notes-${prospect.id}`}
            >
              Save Notes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Prospects() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [newProspect, setNewProspect] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    website: "",
    linkedinUrl: "",
    industry: "",
    companySizeEstimate: "",
    revenueEstimate: "",
    location: "",
    verticalTag: "",
    source: "Manual",
    status: "Not Contacted" as const,
    notes: "",
  });

  const { data: focusData } = useQuery<FocusResponse>({
    queryKey: ["/api/verticals/focus"],
  });

  const lockedVertical = focusData?.focusedVertical?.locked
    ? focusData.focusedVertical.industry
    : null;

  const effectiveVerticalFilter = lockedVertical && !showAll
    ? lockedVertical
    : verticalFilter !== "all" ? verticalFilter : undefined;

  const queryParams = new URLSearchParams();
  if (effectiveVerticalFilter) queryParams.set("verticalTag", effectiveVerticalFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const qs = queryParams.toString();

  const { data: prospects, isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects", qs],
    queryFn: async () => {
      const res = await fetch(`/api/prospects${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const verticals = useMemo(() => {
    if (!prospects) return [];
    const set = new Set(prospects.map((p) => p.verticalTag));
    return Array.from(set).sort();
  }, [prospects]);

  const filtered = useMemo(() => {
    if (!prospects) return [];
    if (!search) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p) =>
        p.companyName.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q)
    );
  }, [prospects, search]);

  const addMutation = useMutation({
    mutationFn: async (data: typeof newProspect) => {
      const res = await apiRequest("POST", "/api/prospects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setAddDialogOpen(false);
      setNewProspect({
        companyName: "", ownerName: "", email: "", phone: "", website: "",
        linkedinUrl: "", industry: "", companySizeEstimate: "", revenueEstimate: "",
        location: "", verticalTag: "", source: "Manual", status: "Not Contacted", notes: "",
      });
      toast({ title: "Prospect added" });
    },
    onError: () => {
      toast({ title: "Failed to add prospect", variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (json: string) => {
      const parsed = JSON.parse(json);
      const res = await apiRequest("POST", "/api/prospects/import", parsed);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setBulkDialogOpen(false);
      setBulkJson("");
      toast({ title: `Imported ${data.prospectsCreated} prospects` });
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const res = await apiRequest("POST", "/api/prospects/export", { spreadsheetId: sheetId });
      return res.json();
    },
    onSuccess: (data: any) => {
      setExportDialogOpen(false);
      setSpreadsheetId("");
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "Export failed", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Prospect List
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Vertical saturation layer — company-first outreach engine
        </p>
      </div>

      {lockedVertical && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-medium" data-testid="text-viewing-vertical">
              Viewing: {lockedVertical} Only
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAll(!showAll)}
            data-testid="button-toggle-show-all"
          >
            {showAll ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showAll ? "Filter to Vertical" : "Show All"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {(!lockedVertical || showAll) && (
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-vertical-filter">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {verticals.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROSPECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-prospect">
                <Plus className="h-3.5 w-3.5" />
                Add Prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Prospect</DialogTitle>
                <DialogDescription>Add a company to your prospect list.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name *</Label>
                  <Input value={newProspect.companyName} onChange={(e) => setNewProspect({ ...newProspect, companyName: e.target.value })} data-testid="input-add-company" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Owner Name *</Label>
                  <Input value={newProspect.ownerName} onChange={(e) => setNewProspect({ ...newProspect, ownerName: e.target.value })} data-testid="input-add-owner" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={newProspect.email} onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })} data-testid="input-add-email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={newProspect.phone} onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })} data-testid="input-add-phone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry *</Label>
                  <Input value={newProspect.industry} onChange={(e) => setNewProspect({ ...newProspect, industry: e.target.value })} data-testid="input-add-industry" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vertical Tag *</Label>
                  <Input value={newProspect.verticalTag} onChange={(e) => setNewProspect({ ...newProspect, verticalTag: e.target.value })} data-testid="input-add-vertical" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Input value={newProspect.companySizeEstimate} onChange={(e) => setNewProspect({ ...newProspect, companySizeEstimate: e.target.value })} data-testid="input-add-size" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <Input value={newProspect.location} onChange={(e) => setNewProspect({ ...newProspect, location: e.target.value })} data-testid="input-add-location" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <Input value={newProspect.website} onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })} data-testid="input-add-website" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LinkedIn URL</Label>
                  <Input value={newProspect.linkedinUrl} onChange={(e) => setNewProspect({ ...newProspect, linkedinUrl: e.target.value })} data-testid="input-add-linkedin" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <Input value={newProspect.source} onChange={(e) => setNewProspect({ ...newProspect, source: e.target.value })} data-testid="input-add-source" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Revenue Estimate</Label>
                  <Input value={newProspect.revenueEstimate} onChange={(e) => setNewProspect({ ...newProspect, revenueEstimate: e.target.value })} data-testid="input-add-revenue" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => addMutation.mutate(newProspect)}
                  disabled={addMutation.isPending || !newProspect.companyName || !newProspect.ownerName || !newProspect.email || !newProspect.industry || !newProspect.verticalTag}
                  data-testid="button-submit-prospect"
                >
                  {addMutation.isPending ? "Adding..." : "Add Prospect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-bulk-import">
                <Upload className="h-3.5 w-3.5" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Import Prospects</DialogTitle>
                <DialogDescription>
                  Paste a JSON object with a "prospects" array. Each item needs companyName, ownerName, email, industry, verticalTag, source, and status.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder='{"prospects": [...]}'
                className="min-h-[200px] font-mono text-xs"
                data-testid="textarea-bulk-json"
              />
              <DialogFooter>
                <Button
                  onClick={() => bulkMutation.mutate(bulkJson)}
                  disabled={bulkMutation.isPending || !bulkJson.trim()}
                  data-testid="button-submit-bulk"
                >
                  {bulkMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-export">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Prospects to Google Sheets</DialogTitle>
                <DialogDescription>Enter the Google Sheet ID to export prospect data.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Spreadsheet ID</Label>
                <Input
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="Paste Google Sheets URL or spreadsheet ID"
                  data-testid="input-export-sheet-id"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => exportMutation.mutate(spreadsheetId)}
                  disabled={exportMutation.isPending || !spreadsheetId}
                  data-testid="button-submit-export"
                >
                  {exportMutation.isPending ? "Exporting..." : "Export"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/15 mb-4" />
            <p className="text-lg font-semibold text-muted-foreground" data-testid="text-empty-state">
              No prospects yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2 max-w-md">
              Add prospects manually or use bulk import to populate your vertical saturation list.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span data-testid="text-prospect-count">{filtered.length} prospect{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
