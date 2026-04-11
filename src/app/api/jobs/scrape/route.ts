import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minute cooldown between scrapes
const BATCH_SIZE = 5; // parallel source-URL re-verifications

const TAVILY_QUERIES = [
  "site:culinaryagents.com chef de partie sous chef fine dining job",
  "site:culinaryagents.com pastry chef baker fine dining job",
  "site:caterer.com sous chef chef de partie Michelin restaurant",
  "site:caterer.com head chef fine dining restaurant job",
  "site:poachedjobs.com chef fine dining restaurant job",
  "site:indeed.com \"chef de partie\" OR \"sous chef\" fine dining Michelin apply",
  "site:linkedin.com/jobs \"chef de partie\" OR \"sous chef\" fine dining restaurant 2025",
  "site:linkedin.com/jobs \"pastry chef\" OR \"head chef\" Michelin restaurant 2025",
  "culinaryagents.com chef job fine dining Michelin starred open apply",
  "fine dining restaurant chef careers page job apply 2025 Michelin",
];

const COUNTRY_ALIASES: Record<string, string> = {
  USA: "United States",
  "U.S.A.": "United States",
  "U.S.": "United States",
  UK: "United Kingdom",
  "U.K.": "United Kingdom",
  "Great Britain": "United Kingdom",
  UAE: "United Arab Emirates",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
};

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface GroqJobListing {
  restaurant_name: string;
  restaurant_stars: number;
  city: string;
  country: string;
  job_title: string;
  job_type: string | null;
  description: string | null;
  apply_url: string | null;
  source_url: string;
  head_chef: string | null;
  cuisine_style: string | null;
  world_50_rank: number | null;
  expires_at: string | null;
}

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 10,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: TavilyResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

function deduplicateByUrl(results: TavilyResult[]): TavilyResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

async function extractJobListings(results: TavilyResult[]): Promise<GroqJobListing[]> {
  if (results.length === 0) return [];

  const context = results
    .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
    .join("\n\n---\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a data extractor for a chef job search tool. Extract active culinary job listings ONLY from the provided search results. Do NOT invent listings not mentioned in the results. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Here are real web search results about culinary job openings:

${context}

Extract ALL active culinary job listings from these results. Include any kitchen role at any quality restaurant worldwide — from Michelin-starred down to well-regarded fine dining and notable independent restaurants.

INCLUDE listings from:
- Michelin-starred restaurants (1, 2, or 3 stars) — highest priority
- Restaurants in World's 50 Best or national top lists
- Well-regarded fine dining restaurants, even without Michelin stars
- Luxury hotel restaurants and destination dining
- Notable pastry kitchens, bakeries, and pâtisseries
- Any named, identifiable restaurant that a professional chef would recognise

DO NOT include:
- Recruitment agency listings for unnamed or anonymous clients
- Non-culinary roles (general management, front-of-house, IT, cleaning)
- Fast food, casual chains, or mass-market restaurants
- Listings with no identifiable restaurant name

Extract EVERY listing you can find in the results above — maximize coverage.
If a result mentions multiple openings at one restaurant, extract each as a separate listing.
Only include listings clearly described in the results above — do not guess or invent.

Return a JSON object with a "job_listings" array. Each item:
{
  "restaurant_name": "exact restaurant name",
  "restaurant_stars": 0 or 1 or 2 or 3 (Michelin stars — set to 0 if not mentioned, ONLY use 1/2/3 if explicitly stated),
  "city": "city",
  "country": "full country name (e.g. United States not USA, United Kingdom not UK)",
  "job_title": "exact job title from the listing",
  "job_type": "role category e.g. Sous Chef, Chef de Partie, Pastry Chef, Head Chef, Commis Chef, or null",
  "description": "brief 1-2 sentence description of the role if available, otherwise null",
  "apply_url": "direct URL to apply or null if not available",
  "source_url": "the URL this result came from",
  "head_chef": "head chef name if mentioned, otherwise null",
  "cuisine_style": "cuisine type if mentioned e.g. French, Japanese, Nordic, otherwise null",
  "world_50_rank": integer rank if in World's 50 Best, otherwise null,
  "expires_at": "ISO date string if closing date mentioned, otherwise null"
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '{"job_listings":[]}';
  try {
    const parsed = JSON.parse(text) as { job_listings?: GroqJobListing[] };
    return Array.isArray(parsed.job_listings) ? parsed.job_listings : [];
  } catch {
    return [];
  }
}

function normalizeCountry(country: string): string {
  return COUNTRY_ALIASES[country.trim()] ?? country.trim();
}

function normalizeApplyUrl(url: string | null, sourceUrl: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  // Try to make relative URLs absolute using the source domain
  try {
    const base = new URL(sourceUrl);
    return new URL(trimmed, base.origin).toString();
  } catch {
    return null;
  }
}

function normalizeJob(raw: GroqJobListing, now: string) {
  return {
    restaurant_name: raw.restaurant_name.trim(),
    restaurant_stars: Math.min(3, Math.max(0, Number(raw.restaurant_stars) || 0)),
    city: raw.city?.trim() ?? "",
    country: normalizeCountry(raw.country ?? ""),
    job_title: raw.job_title?.trim() ?? "",
    job_type: raw.job_type?.trim() || null,
    description: raw.description?.trim() || null,
    apply_url: normalizeApplyUrl(raw.apply_url, raw.source_url ?? ""),
    source_url: raw.source_url?.trim() || null,
    head_chef: raw.head_chef?.trim() || null,
    cuisine_style: raw.cuisine_style?.trim() || null,
    world_50_rank: raw.world_50_rank ?? null,
    expires_at: raw.expires_at ?? null,
    is_active: true,
    scraped_at: now,
  };
}

// Re-verify a source URL: fetch the page, ask Groq if the listing is still open
async function isListingStillActive(
  sourceUrl: string,
  jobTitle: string,
  restaurantName: string
): Promise<boolean> {
  if (!sourceUrl) return false;
  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobVerifier/1.0)" },
    });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) return true; // assume still active on other errors

    const html = await res.text();
    // Truncate to ~3000 chars to stay within token budget
    const snippet = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000);

    const check = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 64,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You check whether a job listing is still open. Return JSON only.",
        },
        {
          role: "user",
          content: `Does the following webpage still show an open job listing for "${jobTitle}" at "${restaurantName}"?

Page content:
${snippet}

Return: { "still_open": true } or { "still_open": false }
If uncertain, return true.`,
        },
      ],
    });

    const txt = check.choices[0]?.message?.content ?? '{"still_open":true}';
    const parsed = JSON.parse(txt) as { still_open?: boolean };
    return parsed.still_open !== false;
  } catch {
    return true; // network error → assume still active
  }
}

async function processBatch<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Rate limit check
  const { data: scrapeRow } = await supabase
    .from("scrape_log")
    .select("last_scraped_at")
    .eq("id", "jobs")
    .maybeSingle();

  if (scrapeRow?.last_scraped_at) {
    const elapsed = Date.now() - new Date(scrapeRow.last_scraped_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const secondsUntilRefresh = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: "Rate limited", seconds_until_refresh: secondsUntilRefresh },
        { status: 429 }
      );
    }
  }

  const now = new Date().toISOString();

  // Update scrape_log immediately so concurrent requests are blocked
  await supabase
    .from("scrape_log")
    .upsert({ id: "jobs", last_scraped_at: now });

  // --- Layer 1: Age-based expiry (>30 days) — fast, no external calls ---
  await supabase
    .from("job_listings")
    .update({ is_active: false })
    .eq("is_active", true)
    .lt("scraped_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // --- Scrape fresh listings ---
  // Run Tavily queries in batches of 5 in parallel to avoid overwhelming the function
  const tavilyResults: TavilyResult[] = [];
  for (let i = 0; i < TAVILY_QUERIES.length; i += 5) {
    const batch = TAVILY_QUERIES.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(tavilySearch));
    tavilyResults.push(...batchResults.flat());
  }

  const dedupedResults = deduplicateByUrl(tavilyResults);

  let insertedCount = 0;
  let tavilyCount = dedupedResults.length;

  if (dedupedResults.length > 0) {
    const extracted = await extractJobListings(dedupedResults);
    const normalized = extracted
      .map((r) => normalizeJob(r, now))
      .filter((r) => r.restaurant_name && r.city && r.job_title);

    if (normalized.length > 0) {
      const { error } = await supabase
        .from("job_listings")
        .upsert(normalized, {
          onConflict: "restaurant_name,city,job_title",
          ignoreDuplicates: false,
        });

      if (!error) {
        insertedCount = normalized.length;
      } else {
        // upsert failed — insertedCount stays 0
      }
    }
  }

  // --- Layer 2: Source URL re-verification (awaited, runs before response) ---
  let expiredCount = 0;
  const { data: activeListings } = await supabase
    .from("job_listings")
    .select("id, source_url, job_title, restaurant_name")
    .eq("is_active", true)
    .lt("scraped_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()); // only verify listings >3 days old

  if (activeListings && activeListings.length > 0) {
    const results = await processBatch(activeListings, BATCH_SIZE, async (listing) => {
      const stillActive = await isListingStillActive(
        listing.source_url ?? "",
        listing.job_title,
        listing.restaurant_name
      );
      if (!stillActive) {
        await supabase
          .from("job_listings")
          .update({ is_active: false })
          .eq("id", listing.id);
      }
      return stillActive;
    });
    expiredCount = results.filter((active) => !active).length;
  }

  return NextResponse.json({
    inserted: insertedCount,
    expired: expiredCount,
    tavily_raw: tavilyCount,
  });
}
