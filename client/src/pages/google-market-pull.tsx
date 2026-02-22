import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  MapPin,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Globe,
  Mail,
  ShieldCheck,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

interface JobStatus {
  id: string;
  status: "idle" | "running" | "completed" | "error";
  stage: string;
  progress: number;
  progressTotal: number;
  message: string;
  stats: {
    businessesFound: number;
    websitesFound: number;
    emailsDiscovered: number;
    emailsVerified: number;
  };
  csvData: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cooldownRemaining?: number;
}

const STAGE_LABELS: Record<string, string> = {
  search: "Searching Google Maps",
  scrape: "Scraping Websites",
  enrich: "Email Discovery",
  verify: "Verifying Emails",
  csv: "Generating CSV",
  done: "Complete",
};

export default function GoogleMarketPull() {
  const { toast } = useToast();
  const [serviceCategory, setServiceCategory] = useState("");
  const [state, setState] = useState("Michigan");
  const [minReviews, setMinReviews] = useState(30);
  const [maxResults, setMaxResults] = useState(500);
  const [limitOnePerDomain, setLimitOnePerDomain] = useState(true);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [exporting, setExporting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/google-market-pull/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobStatus;
        setJob(data);

        if (data.status === "completed" || data.status === "error") {
          es.close();
          eventSourceRef.current = null;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetch("/api/google-market-pull/status")
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        if (data.status === "running") {
          connectSSE();
        }
      })
      .catch(() => {});

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  const handleStart = async () => {
    if (!serviceCategory.trim()) {
      toast({ title: "Service category is required", variant: "destructive" });
      return;
    }

    setStarting(true);
    setDownloaded(false);

    try {
      await apiRequest("POST", "/api/google-market-pull", {
        serviceCategory: serviceCategory.trim(),
        state,
        minReviews,
        maxResults,
        limitOnePerDomain,
      });

      connectSSE();
    } catch (err: any) {
      toast({
        title: "Failed to start",
        description: err.message || "Could not start the job",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/google-market-pull/download");
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `google-market-pull-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloaded(true);
      toast({ title: "CSV downloaded! Data cleared from memory." });

      setJob((prev) => (prev ? { ...prev, status: "idle", csvData: null } : prev));
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleExportToSheets = async () => {
    if (!spreadsheetId.trim()) return;
    setExporting(true);
    try {
      const res = await apiRequest("POST", "/api/google-market-pull/export", {
        spreadsheetId: spreadsheetId.trim(),
      });
      const data = await res.json();
      toast({ title: data.message || "Exported to Google Sheets!" });
      setExportDialogOpen(false);
      setDownloaded(true);
      setJob((prev) => (prev ? { ...prev, status: "idle", csvData: null } : prev));
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setJob(null);
    setDownloaded(false);
    setServiceCategory("");
    setSpreadsheetId("");
  };

  const isRunning = job?.status === "running";
  const isCompleted = job?.status === "completed" && job.csvData;
  const isError = job?.status === "error";
  const progressPercent =
    job && job.progressTotal > 0 ? Math.round((job.progress / job.progressTotal) * 100) : 0;

  const cooldownMinutes = job?.cooldownRemaining
    ? Math.ceil(job.cooldownRemaining / 60000)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Google Market Pull
        </h1>
        <p className="text-muted-foreground mt-1">
          Pull business listings, discover emails, verify, and download CSV.
        </p>
      </div>

      {!isRunning && !isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Configuration
            </CardTitle>
            <CardDescription>
              Enter a service category to pull Google Maps results and extract verified emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="service-category">Service Category</Label>
                <Input
                  id="service-category"
                  placeholder="e.g., Plumber, HVAC, Dentist, Roofing"
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  data-testid="input-service-category"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-reviews">Minimum Reviews</Label>
                <Input
                  id="min-reviews"
                  type="number"
                  min={0}
                  value={minReviews}
                  onChange={(e) => setMinReviews(parseInt(e.target.value) || 0)}
                  data-testid="input-min-reviews"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-results">Max Results</Label>
                <Input
                  id="max-results"
                  type="number"
                  min={1}
                  max={2000}
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 500)}
                  data-testid="input-max-results"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="limit-one-per-domain" className="cursor-pointer">Limit 1 result per unique domain</Label>
                  <p className="text-xs text-muted-foreground">Keeps your list cleaner — one email per business</p>
                </div>
                <Switch
                  id="limit-one-per-domain"
                  checked={limitOnePerDomain}
                  onCheckedChange={setLimitOnePerDomain}
                  data-testid="toggle-limit-one-per-domain"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button
                  onClick={handleStart}
                  disabled={starting || !serviceCategory.trim() || cooldownMinutes > 0}
                  className="w-full"
                  data-testid="button-generate-leads"
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting...
                    </>
                  ) : cooldownMinutes > 0 ? (
                    `Rate limited - try again in ${cooldownMinutes} min`
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Generate Leads
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isRunning || isCompleted || isError) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {isError && <AlertCircle className="h-5 w-5 text-red-500" />}
                {isRunning
                  ? STAGE_LABELS[job?.stage || ""] || "Processing..."
                  : isCompleted
                    ? "Complete"
                    : "Error"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground" data-testid="text-job-message">
                {job?.message}
              </p>

              {isRunning && (
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {job?.progress}/{job?.progressTotal} ({progressPercent}%)
                  </p>
                </div>
              )}

              {isError && job?.error && (
                <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                  {job.error}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold" data-testid="text-businesses-found">
                  {job?.stats.businessesFound || 0}
                </p>
                <p className="text-xs text-muted-foreground">Businesses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Globe className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold" data-testid="text-websites-found">
                  {job?.stats.websitesFound || 0}
                </p>
                <p className="text-xs text-muted-foreground">Websites</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold" data-testid="text-emails-discovered">
                  {job?.stats.emailsDiscovered || 0}
                </p>
                <p className="text-xs text-muted-foreground">Emails Found</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold" data-testid="text-emails-verified">
                  {job?.stats.emailsVerified || 0}
                </p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </CardContent>
            </Card>
          </div>

          {isCompleted && (
            <Card>
              <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
                {!downloaded ? (
                  <>
                    <Button onClick={() => setExportDialogOpen(true)} className="flex-1" data-testid="button-export-sheets">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Google Sheets
                    </Button>
                    <Button variant="outline" onClick={handleDownload} data-testid="button-download-csv">
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="py-2 px-4 text-sm justify-center flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Exported — data cleared from memory
                  </Badge>
                )}
                <Button variant="outline" onClick={handleReset} data-testid="button-new-pull">
                  <Trash2 className="h-4 w-4 mr-2" />
                  New Pull
                </Button>
              </CardContent>
            </Card>
          )}

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export to Google Sheets</DialogTitle>
                <DialogDescription>
                  Paste your Google Sheet URL or ID to export the pulled leads.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="gmp-spreadsheet-id">Google Sheet URL or ID</Label>
                  <Input
                    id="gmp-spreadsheet-id"
                    placeholder="Paste Google Sheets URL or spreadsheet ID"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    data-testid="input-gmp-spreadsheet-id"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportDialogOpen(false)} data-testid="button-cancel-gmp-export">
                  Cancel
                </Button>
                <Button
                  onClick={handleExportToSheets}
                  disabled={exporting || !spreadsheetId.trim()}
                  data-testid="button-confirm-gmp-export"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isError && (
            <Button variant="outline" onClick={handleReset} data-testid="button-try-again">
              Try Again
            </Button>
          )}
        </>
      )}
    </div>
  );
}
