export interface BusinessListing {
  businessName: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewsCount: number;
  sourceQuery: string;
}

interface DataForSEOMapItem {
  title?: string;
  address?: string;
  phone?: string;
  url?: string;
  domain?: string;
  rating?: { value?: number };
  reviews_count?: number;
}

export async function searchGoogleMaps(
  keyword: string,
  onProgress?: (msg: string) => void
): Promise<BusinessListing[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required");
  }

  const cred = Buffer.from(`${login}:${password}`).toString("base64");

  const body = [
    {
      keyword,
      location_code: 2840,
      language_code: "en",
      depth: 100,
    },
  ];

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${cred}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DataForSEO error ${response.status}: ${text}`);
  }

  const data = await response.json();

  const results: BusinessListing[] = [];

  const task = data?.tasks?.[0];
  if (!task) {
    console.error(`DataForSEO no task returned for "${keyword}". Full response:`, JSON.stringify(data).substring(0, 500));
    return results;
  }
  if (task.status_code !== 20000) {
    console.error(`DataForSEO task error for "${keyword}": code=${task.status_code} msg="${task.status_message}"`);
    return results;
  }

  if (task?.result) {
    for (const resultSet of task.result) {
      if (resultSet?.items) {
        for (const item of resultSet.items as DataForSEOMapItem[]) {
          const website = item.url || item.domain || "";
          if (!website) continue;

          results.push({
            businessName: item.title || "",
            address: item.address || "",
            city: "",
            phone: item.phone || "",
            website: website.startsWith("http") ? website : `https://${website}`,
            rating: item.rating?.value || 0,
            reviewsCount: item.reviews_count || 0,
            sourceQuery: keyword,
          });
        }
      }
    }
  }

  console.log(`DataForSEO "${keyword}": ${results.length} raw results`);
  return results;
}

export async function pullBusinessListings(
  serviceCategory: string,
  state: string,
  cities: string[],
  minReviews: number,
  maxResults: number,
  onProgress?: (msg: string, processed: number, total: number) => void
): Promise<BusinessListing[]> {
  const allListings: BusinessListing[] = [];
  const seenWebsites = new Set<string>();

  for (let i = 0; i < cities.length; i++) {
    if (allListings.length >= maxResults) break;

    const city = cities[i];
    const query = `${serviceCategory} ${city} ${state === "Michigan" ? "MI" : state}`;

    onProgress?.(`Searching: ${query}`, i + 1, cities.length);

    try {
      const listings = await searchGoogleMaps(query);

      for (const listing of listings) {
        if (allListings.length >= maxResults) break;

        const domain = extractDomain(listing.website);
        if (seenWebsites.has(domain)) continue;
        if (listing.reviewsCount < minReviews) continue;

        seenWebsites.add(domain);
        listing.city = city;
        allListings.push(listing);
      }

      await delay(500);
    } catch (err: any) {
      console.error(`DataForSEO error for "${query}":`, err.message);
      onProgress?.(`Error searching ${city}, skipping...`, i + 1, cities.length);
    }
  }

  return allListings;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
