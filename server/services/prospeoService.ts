export interface ProspeoResult {
  email: string;
  emailStatus: string;
}

export async function findEmailsByDomain(domain: string): Promise<ProspeoResult[]> {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey) {
    throw new Error("PROSPEO_API_KEY is required");
  }

  try {
    const response = await fetch("https://api.prospeo.io/domain-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": apiKey,
      },
      body: JSON.stringify({
        company: domain,
        limit: 10,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Prospeo error for ${domain}: ${response.status} ${text}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error(`Prospeo error for ${domain}:`, data.message);
      return [];
    }

    const results: ProspeoResult[] = [];

    if (data.response?.email_list) {
      for (const entry of data.response.email_list) {
        if (entry.email) {
          results.push({
            email: entry.email.toLowerCase(),
            emailStatus: entry.verification?.status || "unknown",
          });
        }
      }
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
