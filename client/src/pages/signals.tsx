import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Radio,
  Search,
  ExternalLink,
  Building2,
  MapPin,
  User,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import type { Signal } from "@shared/schema";

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{signal.personOrCompanyName}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{signal.role}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{signal.industry}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {signal.companySizeEstimate}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {signal.location}
        </div>
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="text-sm italic text-muted-foreground line-clamp-2">
          "{signal.painQuote}"
        </p>
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="text-sm line-clamp-2">{signal.painSummary}</p>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(signal.dateDetected).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>
        {signal.sourceUrl && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold">{signal.personOrCompanyName}</h3>
            <p className="text-sm text-muted-foreground">{signal.role}</p>
          </div>
          {signal.sourceUrl && (
            <Button variant="ghost" size="icon" asChild>
              <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            {signal.industry}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {signal.companySizeEstimate}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            {signal.location}
          </Badge>
        </div>

        <blockquote className="border-l-2 border-primary/30 pl-3 mb-3">
          <p className="text-sm italic text-muted-foreground">
            "{signal.painQuote}"
          </p>
        </blockquote>

        <p className="text-sm">{signal.painSummary}</p>

        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Detected {new Date(signal.dateDetected).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Signals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { data: signals, isLoading } = useQuery<Signal[]>({
    queryKey: ["/api/signals"],
  });

  const filteredSignals = signals?.filter((signal) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      signal.personOrCompanyName.toLowerCase().includes(query) ||
      signal.role.toLowerCase().includes(query) ||
      signal.industry.toLowerCase().includes(query) ||
      signal.painQuote.toLowerCase().includes(query) ||
      signal.painSummary.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
          <p className="text-muted-foreground text-sm">
            Pain signals detected from research sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Radio className="h-3 w-3" />
            {signals?.length ?? 0} detected
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search signals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-signals"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            Table
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            data-testid="button-view-cards"
          >
            Cards
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32 mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSignals && filteredSignals.length > 0 ? (
        viewMode === "table" ? (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person / Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Pain Quote</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">No signals found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? "No signals match your search. Try different keywords."
                : "Upload research data from the Ingest page to detect pain signals."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
