const SEARCH_PERSON_LIMIT = 10;
const ENRICH_PER_BUSINESS_CAP = 2;

const ROLE_PRIORITY = [
  "Founder/Owner",
  "C-Suite",
  "VP",
  "Director",
  "Manager",
];

export interface ProspeoResult {
  email: string;
  emailStatus: string;
  fullName?: string;
  jobTitle?: string;
}

export interface ProspeoRunSummary {
  businessesProcessed: number;
  contactsFound: number;
  enrichAttempts: number;
  verifiedEmailsReturned: number;
  creditsEstimated: number;
}

interface SearchPersonResult {
  person: {
    person_id?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    current_job_title?: string;
    linkedin_url?: string;
  };
  company: {
    name?: string;
    domain?: string;
  };
}

let currentRunSummary: ProspeoRunSummary = {
  businessesProcessed: 0,
  contactsFound: 0,
  enrichAttempts: 0,
  verifiedEmailsReturned: 0,
  creditsEstimated: 0,
};

export function resetRunSummary(): void {
  currentRunSummary = {
    businessesProcessed: 0,
    contactsFound: 0,
    enrichAttempts: 0,
    verifiedEmailsReturned: 0,
    creditsEstimated: 0,
  };
}

export function getRunSummary(): ProspeoRunSummary {
  return { ...currentRunSummary };
}

function logRunSummary(): void {
  const s = currentRunSummary;
  console.log(`\n=== Prospeo Run Summary ===`);
  console.log(`  Businesses processed:     ${s.businessesProcessed}`);
  console.log(`  Contacts found (search):  ${s.contactsFound}`);
  console.log(`  Enrich attempts:          ${s.enrichAttempts}`);
  console.log(`  Verified emails returned: ${s.verifiedEmailsReturned}`);
  console.log(`  Credits estimated:        ${s.creditsEstimated}`);
  console.log(`===========================\n`);
}

export { logRunSummary };

function seniorityRank(title: string | undefined): number {
  if (!title) return ROLE_PRIORITY.length;
  const lower = title.toLowerCase();
  for (let i = 0; i < ROLE_PRIORITY.length; i++) {
    const role = ROLE_PRIORITY[i].toLowerCase();
    if (lower.includes(role.split("/")[0])) return i;
  }
  if (lower.includes("owner")) return 0;
  if (lower.includes("founder")) return 0;
  if (lower.includes("ceo") || lower.includes("cfo") || lower.includes("coo") || lower.includes("cto")) return 1;
  if (lower.includes("vp") || lower.includes("vice president")) return 2;
  if (lower.includes("director")) return 3;
  if (lower.includes("manager")) return 4;
  return ROLE_PRIORITY.length;
}

export async function findEmailsByDomain(domain: string): Promise<ProspeoResult[]> {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey) {
    throw new Error("PROSPEO_API_KEY is required");
  }

  currentRunSummary.businessesProcessed++;

  try {
    const searchResponse = await fetch("https://api.prospeo.io/search-person", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": apiKey,
      },
      body: JSON.stringify({
        page: 1,
        filters: {
          company: {
            websites: {
              include: [domain],
            },
          },
          person_seniority: {
            include: ROLE_PRIORITY,
          },
        },
      }),
    });

    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      console.error(`Prospeo search-person error for ${domain}: ${searchResponse.status} ${text}`);
      return [];
    }

    const searchData = await searchResponse.json();

    if (searchData.error) {
      if (searchData.error_code !== "NO_MATCH") {
        console.error(`Prospeo search-person error for ${domain}:`, searchData.error_code || searchData.message);
      }
      return [];
    }

    const people: SearchPersonResult[] = (searchData.results || []).slice(0, SEARCH_PERSON_LIMIT);
    if (people.length === 0) {
      return [];
    }

    currentRunSummary.contactsFound += people.length;

    people.sort((a, b) => seniorityRank(a.person.current_job_title) - seniorityRank(b.person.current_job_title));

    const results: ProspeoResult[] = [];

    for (const match of people) {
      if (results.length >= ENRICH_PER_BUSINESS_CAP) break;

      const person = match.person;
      const fullName = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim();

      if (!fullName) continue;

      currentRunSummary.enrichAttempts++;
      currentRunSummary.creditsEstimated++;

      try {
        const enrichResponse = await fetch("https://api.prospeo.io/enrich-person", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KEY": apiKey,
          },
          body: JSON.stringify({
            only_verified_email: true,
            data: {
              full_name: fullName,
              company_website: domain,
            },
          }),
        });

        if (!enrichResponse.ok) {
          continue;
        }

        const enrichData = await enrichResponse.json();

        if (enrichData.error) {
          if (enrichData.error_code === "NO_MATCH") {
            currentRunSummary.creditsEstimated--;
          }
          continue;
        }

        if (enrichData.person?.email) {
          results.push({
            email: enrichData.person.email.toLowerCase(),
            emailStatus: "verified",
            fullName: fullName,
            jobTitle: person.current_job_title || undefined,
          });
          currentRunSummary.verifiedEmailsReturned++;
        }
      } catch {
        // Skip enrichment failures
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return results;
  } catch (err: any) {
    console.error(`Prospeo request failed for ${domain}:`, err.message);
    return [];
  }
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
