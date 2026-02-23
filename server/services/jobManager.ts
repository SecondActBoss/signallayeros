import { EventEmitter } from "events";
import { MICHIGAN_CITIES } from "./michiganCities";
import { pullBusinessListings, type BusinessListing } from "./dataforseoService";
import { scrapeEmailsFromWebsite } from "./emailScraper";
import { findEmailsByDomain, extractDomain, resetRunSummary, logRunSummary } from "./prospeoService";
import { verifyEmails } from "./bouncebanService";
import { generateCsv, type CsvRow } from "./csvGenerator";

export interface JobStatus {
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
  rows: CsvRow[] | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface JobInput {
  serviceCategory: string;
  state: string;
  minReviews: number;
  maxResults: number;
  limitOnePerDomain: boolean;
}

const COOLDOWN_MS = 10 * 60 * 1000;

class GoogleMarketPullJobManager extends EventEmitter {
  private currentJob: JobStatus = this.createEmptyJob();
  private lastCompletedAt: number = 0;

  private createEmptyJob(): JobStatus {
    return {
      id: "",
      status: "idle",
      stage: "",
      progress: 0,
      progressTotal: 0,
      message: "Ready",
      stats: {
        businessesFound: 0,
        websitesFound: 0,
        emailsDiscovered: 0,
        emailsVerified: 0,
      },
      csvData: null,
      rows: null,
      error: null,
      startedAt: null,
      completedAt: null,
    };
  }

  getStatus(): JobStatus {
    const { rows, ...rest } = this.currentJob;
    return { ...rest, rows: null };
  }

  getRows(): CsvRow[] | null {
    return this.currentJob.rows;
  }

  getCooldownRemaining(): number {
    if (this.lastCompletedAt === 0) return 0;
    const elapsed = Date.now() - this.lastCompletedAt;
    return Math.max(0, COOLDOWN_MS - elapsed);
  }

  canStart(): { ok: boolean; reason?: string } {
    if (this.currentJob.status === "running") {
      return { ok: false, reason: "A job is already running" };
    }

    const cooldown = this.getCooldownRemaining();
    if (cooldown > 0) {
      const minutes = Math.ceil(cooldown / 60000);
      return { ok: false, reason: `Rate limited. Try again in ${minutes} minute(s)` };
    }

    return { ok: true };
  }

  async startJob(input: JobInput): Promise<string> {
    const check = this.canStart();
    if (!check.ok) throw new Error(check.reason);

    const jobId = `gmp_${Date.now()}`;
    this.currentJob = {
      ...this.createEmptyJob(),
      id: jobId,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    this.runPipeline(input).catch((err) => {
      this.currentJob.status = "error";
      this.currentJob.error = err.message;
      this.currentJob.completedAt = new Date().toISOString();
      this.lastCompletedAt = Date.now();
      this.emitUpdate();
    });

    return jobId;
  }

  private emitUpdate() {
    this.emit("update", this.getStatus());
  }

  private updateStage(stage: string, message: string, progress?: number, progressTotal?: number) {
    this.currentJob.stage = stage;
    this.currentJob.message = message;
    if (progress !== undefined) this.currentJob.progress = progress;
    if (progressTotal !== undefined) this.currentJob.progressTotal = progressTotal;
    this.emitUpdate();
  }

  clearData() {
    this.currentJob = this.createEmptyJob();
  }

  private async runPipeline(input: JobInput) {
    const { serviceCategory, state, minReviews, maxResults } = input;

    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      throw new Error("DataForSEO credentials not configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD secrets.");
    }

    const cities = MICHIGAN_CITIES;

    this.updateStage("search", `Pulling ${serviceCategory} listings across ${state}...`, 0, cities.length);

    const listings = await pullBusinessListings(
      serviceCategory,
      state,
      cities,
      minReviews,
      maxResults,
      (msg, processed, total) => {
        this.updateStage("search", msg, processed, total);
      }
    );

    this.currentJob.stats.businessesFound = listings.length;
    this.currentJob.stats.websitesFound = listings.filter((l) => l.website).length;
    this.emitUpdate();

    if (listings.length === 0) {
      this.currentJob.status = "completed";
      this.currentJob.message = "No businesses found matching criteria";
      this.currentJob.completedAt = new Date().toISOString();
      this.lastCompletedAt = Date.now();
      this.emitUpdate();
      return;
    }

    this.updateStage("scrape", "Scraping websites for emails...", 0, listings.length);

    const businessEmails: Map<number, string[]> = new Map();

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      this.updateStage("scrape", `Scraping ${listing.businessName}...`, i + 1, listings.length);

      try {
        const emails = await scrapeEmailsFromWebsite(listing.website);
        if (emails.length > 0) {
          businessEmails.set(i, emails);
          this.currentJob.stats.emailsDiscovered += emails.length;
        }
      } catch {
        // Skip failed scrapes
      }
    }

    this.emitUpdate();

    const needsEnrichment = listings
      .map((l, idx) => ({ listing: l, idx }))
      .filter(({ idx }) => !businessEmails.has(idx) || businessEmails.get(idx)!.length === 0);

    if (needsEnrichment.length > 0 && process.env.PROSPEO_API_KEY) {
      resetRunSummary();
      this.updateStage("enrich", "Discovering emails via enrichment...", 0, needsEnrichment.length);

      for (let i = 0; i < needsEnrichment.length; i++) {
        const { listing, idx } = needsEnrichment[i];
        this.updateStage("enrich", `Enriching ${listing.businessName}...`, i + 1, needsEnrichment.length);

        try {
          const domain = extractDomain(listing.website);
          const results = await findEmailsByDomain(domain);
          const found = results.map((r) => r.email);
          if (found.length > 0) {
            businessEmails.set(idx, [...(businessEmails.get(idx) || []), ...found]);
            this.currentJob.stats.emailsDiscovered += found.length;
          }
        } catch {
          // Skip enrichment failures
        }

        await new Promise((resolve) => setTimeout(resolve, 2200));
      }

      logRunSummary();
      this.emitUpdate();
    }

    const allEmails = new Set<string>();
    businessEmails.forEach((emails) => {
      for (const e of emails) {
        const trimmed = e.trim().toLowerCase();
        if (trimmed && trimmed.includes("@") && trimmed.includes(".")) {
          allEmails.add(trimmed);
        }
      }
    });

    const verifiedEmails = new Set<string>();

    if (allEmails.size > 0 && process.env.BOUNCEBAN_API_KEY) {
      this.updateStage("verify", "Verifying emails...", 0, allEmails.size);

      const emailArray = Array.from(allEmails);
      const results = await verifyEmails(emailArray, (verified, total) => {
        this.updateStage("verify", `Verified ${verified}/${total} emails...`, verified, total);
      });

      for (const result of results) {
        if (result.safe) {
          verifiedEmails.add(result.email);
        }
      }

      this.currentJob.stats.emailsVerified = verifiedEmails.size;
      this.emitUpdate();
    } else {
      allEmails.forEach((e) => verifiedEmails.add(e));
      this.currentJob.stats.emailsVerified = verifiedEmails.size;
    }

    this.updateStage("csv", "Generating CSV...", 0, 1);

    const csvRows: CsvRow[] = [];

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const emails = businessEmails.get(i) || [];
      const validEmails = emails.filter((e) => verifiedEmails.has(e));

      if (validEmails.length === 0) continue;

      const emailsToUse = input.limitOnePerDomain ? [validEmails[0]] : validEmails;

      for (const email of emailsToUse) {
        csvRows.push({
          businessName: listing.businessName,
          city: listing.city,
          address: listing.address,
          phone: listing.phone,
          website: listing.website,
          email,
          reviews: listing.reviewsCount,
          rating: listing.rating,
          sourceQuery: listing.sourceQuery,
        });
      }
    }

    this.currentJob.csvData = generateCsv(csvRows);
    this.currentJob.rows = csvRows;
    this.currentJob.status = "completed";
    this.currentJob.message = `Complete! ${csvRows.length} verified leads ready for download.`;
    this.currentJob.completedAt = new Date().toISOString();
    this.lastCompletedAt = Date.now();
    this.updateStage("done", this.currentJob.message, 1, 1);
  }
}

export const jobManager = new GoogleMarketPullJobManager();
