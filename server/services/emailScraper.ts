const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const EXCLUDED_EMAILS = new Set([
  "example@example.com",
  "email@example.com",
  "name@domain.com",
  "user@example.com",
  "your@email.com",
  "info@example.com",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
  ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
]);

export async function scrapeEmailsFromWebsite(websiteUrl: string): Promise<string[]> {
  const emails = new Set<string>();
  const domain = extractDomain(websiteUrl);

  const pagesToTry = [
    websiteUrl,
    new URL("/contact", websiteUrl).href,
    new URL("/about", websiteUrl).href,
    new URL("/contact-us", websiteUrl).href,
    new URL("/about-us", websiteUrl).href,
  ];

  for (const pageUrl of pagesToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SignalLayerOS/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) continue;

      const html = await response.text();
      const matches = html.match(EMAIL_REGEX) || [];

      for (const email of matches) {
        const lower = email.toLowerCase();
        if (EXCLUDED_EMAILS.has(lower)) continue;
        if (EXCLUDED_EXTENSIONS.has(lower.substring(lower.lastIndexOf(".")))) continue;
        if (lower.includes("sentry") || lower.includes("webpack") || lower.includes("schema.org")) continue;

        const emailDomain = lower.split("@")[1];
        if (emailDomain && (emailDomain === domain || emailDomain.endsWith(`.${domain}`))) {
          emails.add(lower);
        }
      }
    } catch {
      // Skip unreachable pages
    }
  }

  return Array.from(emails);
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
