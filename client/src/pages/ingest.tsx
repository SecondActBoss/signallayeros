import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileJson,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const singleSignalSchema = z.object({
  personOrCompanyName: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  industry: z.string().min(1, "Required"),
  companySizeEstimate: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  painQuote: z.string().min(10, "Pain quote should be at least 10 characters"),
  painSummary: z.string().min(10, "Summary should be at least 10 characters"),
  sourceUrl: z.union([z.string().url(), z.literal("")]).optional(),
  dateDetected: z.string().min(1, "Required"),
});

type SingleSignalForm = z.infer<typeof singleSignalSchema>;

export default function Ingest() {
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<SingleSignalForm>({
    resolver: zodResolver(singleSignalSchema),
    defaultValues: {
      personOrCompanyName: "",
      role: "",
      industry: "",
      companySizeEstimate: "",
      location: "",
      painQuote: "",
      painSummary: "",
      sourceUrl: "",
      dateDetected: new Date().toISOString().split("T")[0],
    },
  });

  const bulkIngestMutation = useMutation({
    mutationFn: async (signals: any[]) => {
      const response = await apiRequest("POST", "/api/signals/bulk", { signals });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Signals Ingested",
        description: `${data.signalsCreated} signals processed, ${data.leadsCreated} leads scored.`,
      });
      setJsonInput("");
      setJsonError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ingestion Failed",
        description: error.message || "Please check your JSON format and try again.",
        variant: "destructive",
      });
    },
  });

  const singleIngestMutation = useMutation({
    mutationFn: async (signal: SingleSignalForm) => {
      const response = await apiRequest("POST", "/api/signals", signal);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Signal Added",
        description: "Signal has been processed and scored.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Signal",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const signals = Array.isArray(parsed) ? parsed : parsed.signals || [parsed];
      if (!Array.isArray(signals) || signals.length === 0) {
        throw new Error("Input must be an array of signals or an object with a 'signals' array");
      }
      setJsonError(null);
      bulkIngestMutation.mutate(signals);
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON format");
    }
  };

  const onSingleSubmit = (data: SingleSignalForm) => {
    singleIngestMutation.mutate(data);
  };

  const exampleJson = `[
  {
    "personOrCompanyName": "Mike's Plumbing Co",
    "role": "Owner/Operator",
    "industry": "Home Services",
    "companySizeEstimate": "15-25",
    "location": "Austin, TX",
    "painQuote": "I'm on the phone all day but nothing actually gets done. Every time I think I'm caught up, three more calls come in.",
    "painSummary": "Owner overwhelmed by coordination overhead. Inbound calls competing with operational work. Classic founder bottleneck.",
    "sourceUrl": "https://example.com/forum/post/123",
    "dateDetected": "2024-01-15"
  }
]`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingest</h1>
          <p className="text-muted-foreground text-sm">
            Upload research data to detect pain signals
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Upload className="h-3 w-3" />
          Signal Ingestion
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Bulk JSON Import
            </CardTitle>
            <CardDescription>
              Paste JSON output from research tools (Manus, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 overflow-hidden">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium mb-1">Expected JSON format:</p>
                  <pre className="overflow-x-auto text-xs bg-background/50 p-2 rounded whitespace-pre-wrap break-all">
                    {exampleJson}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="json-input">JSON Data</Label>
              <Textarea
                id="json-input"
                placeholder="Paste your JSON here..."
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError(null);
                }}
                className="min-h-[200px] font-mono text-sm mt-2"
                data-testid="textarea-json-input"
              />
              {jsonError && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {jsonError}
                </div>
              )}
            </div>

            <Button
              onClick={handleJsonSubmit}
              disabled={!jsonInput.trim() || bulkIngestMutation.isPending}
              className="w-full"
              data-testid="button-bulk-ingest"
            >
              {bulkIngestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {bulkIngestMutation.isPending ? "Processing..." : "Ingest Signals"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Single Signal
            </CardTitle>
            <CardDescription>
              Manually add a pain signal for detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSingleSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personOrCompanyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Person / Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Mike's Plumbing Co" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Owner/Operator" {...field} data-testid="input-role" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Home Services" {...field} data-testid="input-industry" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companySizeEstimate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Size</FormLabel>
                        <FormControl>
                          <Input placeholder="15-25" {...field} data-testid="input-size" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Austin, TX" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateDetected"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Detected</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="painQuote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pain Quote</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="First-person language expressing the pain..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-pain-quote"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="painSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pain Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Plain language summary of the pain..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-pain-summary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} data-testid="input-source-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={singleIngestMutation.isPending}
                  className="w-full"
                  data-testid="button-add-signal"
                >
                  {singleIngestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {singleIngestMutation.isPending ? "Processing..." : "Add Signal"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ICP Qualification Criteria</CardTitle>
          <CardDescription>
            Signals are filtered based on these target criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm mb-2 text-emerald-500">Target ICP</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Founders, Operators, COOs, Heads of Ops</li>
                <li>• 5-100 person companies</li>
                <li>• US-based</li>
                <li>• Growing faster than systems</li>
                <li>• Paying close to the money</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm mb-2 text-blue-500">Primary Pain Signals</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Busy all day but nothing moved"</li>
                <li>• Everything depends on me</li>
                <li>• Follow-ups falling through cracks</li>
                <li>• Missed calls / slow responses</li>
                <li>• Turnover, rehiring fatigue</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm mb-2 text-destructive">Strict Exclusions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Enterprise procurement language</li>
                <li>• Governance-first questions</li>
                <li>• AI curiosity without pain</li>
                <li>• Tool comparisons</li>
                <li>• Meta-agent enthusiasm</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
