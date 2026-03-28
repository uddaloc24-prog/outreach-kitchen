import * as cheerio from "cheerio";
import { z } from "zod";

export const researchRestaurantInput = z.object({
  restaurant_id: z.string(),
  website_url: z.string(),
  restaurant_name: z.string(),
  head_chef: z.string().optional().default(""),
});

const PAGES_TO_SCRAPE = ["/contact", "/careers", "/jobs", "/about", "/team", "/"];

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ── Firecrawl ──────────────────────────────────────────────────────────────

async function firecrawlScrape(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { markdown?: string } };
    return data.data?.markdown ?? null;
  } catch {
    return null;
  }
}

// ── Single-page Cheerio scrape ─────────────────────────────────────────────

async function cheerioScrape(url: string): Promise<{ text: string; emails: string[] }> {
  try {
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { text: "", emails: [] };
    const html = await res.text();
    const $ = cheerio.load(html);

    // mailto: links are the most reliable source
    const mailtoEmails: string[] = [];
    $("a[href^='mailto:']").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
      if (email && email.includes("@")) mailtoEmails.push(email);
    });

    $("script, style, nav, footer, header").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);
    const textEmails = extractEmailsFromText(text);

    return { text, emails: [...new Set([...mailtoEmails, ...textEmails])] };
  } catch {
    return { text: "", emails: [] };
  }
}

// ── Tavily web search ─────────────────────────────────────────────────────

interface TavilyResult {
  url: string;
  content: string;
}

async function searchWebForEmail(
  restaurantName: string,
  websiteDomain: string
): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const queries = [
    `"${restaurantName}" chef application careers email contact`,
    `${restaurantName} ${websiteDomain} email careers jobs apply`,
  ];

  const foundEmails: string[] = [];

  for (const query of queries) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: 5,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const data = await res.json() as { results?: TavilyResult[] };

      for (const result of data.results ?? []) {
        // Extract emails from snippet text
        foundEmails.push(...extractEmailsFromText(result.content));

        // If the result URL looks like a contact/careers page, scrape it directly
        const urlLower = result.url.toLowerCase();
        if (
          urlLower.includes("contact") ||
          urlLower.includes("career") ||
          urlLower.includes("job") ||
          urlLower.includes("apply") ||
          urlLower.includes(websiteDomain)
        ) {
          const { emails } = await cheerioScrape(result.url);
          foundEmails.push(...emails);
        }
      }

      if (foundEmails.length > 0) break;
    } catch {
      continue;
    }
  }

  return foundEmails;
}

// ── Email helpers ──────────────────────────────────────────────────────────

function extractEmailsFromText(text: string): string[] {
  const matches = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) ?? [];
  return matches
    .map((e) => e.toLowerCase())
    .filter(
      (e) =>
        !e.includes("example.") &&
        !e.endsWith(".png") &&
        !e.endsWith(".jpg") &&
        !e.endsWith(".gif") &&
        !e.includes("sentry.") &&
        !e.includes("wixpress.") &&
        e.split(".").pop()!.length <= 6
    );
}

function rankEmail(email: string, restaurantDomain?: string): number {
  const [, domain] = email.split("@");
  // Emails from an unrelated domain are almost certainly wrong — discard them
  if (restaurantDomain && domain && !domain.includes(restaurantDomain) && !restaurantDomain.includes(domain)) {
    return 0;
  }
  const careerKeywords = ["career", "job", "apply", "recruit", "hr", "work", "employ"];
  const contactKeywords = ["info", "contact", "hello", "team", "general", "enqui"];
  if (careerKeywords.some((k) => email.includes(k))) return 3;
  if (contactKeywords.some((k) => email.includes(k))) return 2;
  return 1;
}

function dedupeRanked(emails: string[], restaurantDomain?: string): string[] {
  const unique = [...new Set(emails)];
  // Filter out emails from unrelated domains
  const trusted = restaurantDomain ? unique.filter((e) => rankEmail(e, restaurantDomain) > 0) : unique;
  trusted.sort((a, b) => rankEmail(b, restaurantDomain) - rankEmail(a, restaurantDomain));
  return trusted;
}

// ── Main export ────────────────────────────────────────────────────────────

export async function researchRestaurant(
  input: z.infer<typeof researchRestaurantInput>
) {
  const { website_url, restaurant_name, head_chef } = input;

  if (!website_url) {
    return {
      philosophy: "No website URL provided.",
      menu_highlights: "",
      chef_background: head_chef ? `Head chef: ${head_chef}` : "",
      recent_press: "",
      sustainability_notes: "",
      raw_text: `${restaurant_name} — no website URL available.`,
      emails_found: [],
    };
  }

  const baseUrl = website_url.replace(/\/$/, "");
  const domain = new URL(website_url).hostname.replace(/^www\./, "");
  const rawParts: string[] = [];
  const allEmails: string[] = [];

  // 1. Try Firecrawl (if API key set)
  const firecrawlResult = await firecrawlScrape(baseUrl);
  if (firecrawlResult) {
    rawParts.push(firecrawlResult.slice(0, 8000));
    allEmails.push(...extractEmailsFromText(firecrawlResult));
  } else {
    // 2. Cheerio fallback — contact/careers pages first
    for (const path of PAGES_TO_SCRAPE) {
      const { text, emails } = await cheerioScrape(`${baseUrl}${path}`);
      if (text) rawParts.push(text.slice(0, 2000));
      allEmails.push(...emails);
    }
  }

  // 3. If still no emails found, search the web
  if (allEmails.length === 0) {
    const webEmails = await searchWebForEmail(restaurant_name, domain);
    allEmails.push(...webEmails);
  }

  const rawText = rawParts.join("\n\n").slice(0, 12000);
  const uniqueEmails = dedupeRanked(allEmails, domain);

  const philosophy = extractSection(rawText, ["philosophy", "our story", "about", "mission", "vision"]);
  const menuHighlights = extractSection(rawText, ["menu", "tasting", "seasonal", "dishes"]);
  const chefBackground = extractSection(rawText, ["chef", head_chef.toLowerCase(), "team", "brigade"]);
  const sustainability = extractSection(rawText, ["sustainable", "local", "organic", "farm", "forage"]);

  return {
    philosophy: philosophy || `${restaurant_name} — extracted text available`,
    menu_highlights: menuHighlights || "",
    chef_background: chefBackground || (head_chef ? `Head chef: ${head_chef}` : ""),
    recent_press: "",
    sustainability_notes: sustainability || "",
    raw_text: rawText,
    emails_found: uniqueEmails,
  };
}

function extractSection(text: string, keywords: string[]): string {
  const lines = text.split(/[\n.!?]/).map((l) => l.trim()).filter((l) => l.length > 30);
  const relevant = lines.filter((line) =>
    keywords.some((kw) => line.toLowerCase().includes(kw))
  );
  return relevant.slice(0, 5).join(". ").slice(0, 500);
}
