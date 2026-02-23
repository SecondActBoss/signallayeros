export interface ProspeoResult {
  email: string;
  emailStatus: string;
  fullName?: string;
  jobTitle?: string;
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

export async function findEmailsByDomain(domain: string): Promise<ProspeoResult[]> {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey) {
    throw new Error("PROSPEO_API_KEY is required");
  }

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
            include: ["Founder/Owner", "C-Suite", "VP", "Director"],
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

    const people: SearchPersonResult[] = searchData.results || [];
    if (people.length === 0) {
      return [];
    }

    const results: ProspeoResult[] = [];
    const maxEnrich = Math.min(people.length, 3);

    for (let i = 0; i < maxEnrich; i++) {
      const person = people[i].person;
      const fullName = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim();

      if (!fullName) continue;

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

        if (!enrichData.error && enrichData.person?.email) {
          results.push({
            email: enrichData.person.email.toLowerCase(),
            emailStatus: "verified",
            fullName: fullName,
            jobTitle: person.current_job_title || undefined,
          });
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
