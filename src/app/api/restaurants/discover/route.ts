import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Rotating discovery queries — each batch picks 2 queries.
 * Covers every major culinary region so the list keeps growing.
 */
const DISCOVER_QUERIES = [
  // Europe
  "Michelin star restaurants Paris France chef kitchen 2025",
  "Michelin star restaurants London United Kingdom chef 2025",
  "Michelin star restaurants Copenhagen Denmark Nordic chef 2025",
  "Michelin star restaurants Barcelona Spain chef 2025",
  "Michelin star restaurants Madrid Spain chef 2025",
  "Michelin star restaurants Rome Italy chef fine dining 2025",
  "Michelin star restaurants Milan Italy chef 2025",
  "Michelin star restaurants Stockholm Sweden Nordic kitchen 2025",
  "Michelin star restaurants Amsterdam Netherlands chef 2025",
  "Michelin star restaurants Berlin Germany fine dining chef 2025",
  "Michelin star restaurants Munich Germany chef 2025",
  "Michelin star restaurants Vienna Austria chef fine dining 2025",
  "Michelin star restaurants Brussels Belgium chef 2025",
  "Michelin star restaurants Lisbon Portugal chef 2025",
  "Michelin star restaurants Zurich Switzerland fine dining 2025",
  "Michelin star restaurants Oslo Norway Nordic chef 2025",
  "Michelin star restaurants Dublin Ireland chef 2025",
  "Michelin star restaurants Athens Greece chef fine dining 2025",
  "Michelin star restaurants Lyon France chef gastronomy 2025",
  "Michelin star restaurants San Sebastian Spain Basque chef 2025",
  "Michelin star restaurants Florence Italy Tuscan chef 2025",
  "Michelin star restaurants Edinburgh Scotland chef 2025",
  "Michelin star restaurants Prague Czech Republic chef 2025",
  "Michelin star restaurants Budapest Hungary fine dining 2025",
  "Michelin star restaurants Helsinki Finland Nordic chef 2025",
  // Asia
  "Michelin star restaurants Tokyo Japan chef kitchen 2025",
  "Michelin star restaurants Kyoto Japan kaiseki chef 2025",
  "Michelin star restaurants Osaka Japan chef 2025",
  "Michelin star restaurants Bangkok Thailand chef fine dining 2025",
  "Michelin star restaurants Singapore chef fine dining 2025",
  "Michelin star restaurants Hong Kong chef fine dining 2025",
  "Michelin star restaurants Seoul South Korea chef 2025",
  "Michelin star restaurants Shanghai China chef fine dining 2025",
  "Michelin star restaurants Taipei Taiwan chef 2025",
  "Michelin star restaurants Mumbai India chef fine dining 2025",
  "Michelin star restaurants Delhi India chef gastronomy 2025",
  // Americas
  "Michelin star restaurants New York USA chef fine dining 2025",
  "Michelin star restaurants Los Angeles California chef 2025",
  "Michelin star restaurants San Francisco California chef 2025",
  "Michelin star restaurants Chicago USA chef fine dining 2025",
  "Michelin star restaurants Mexico City Mexico chef 2025",
  "Michelin star restaurants Lima Peru chef gastronomy 2025",
  "Michelin star restaurants Sao Paulo Brazil chef fine dining 2025",
  "Michelin star restaurants Bogota Colombia chef 2025",
  "Michelin star restaurants Buenos Aires Argentina chef 2025",
  "Michelin star restaurants Toronto Canada chef fine dining 2025",
  "Michelin star restaurants Miami USA chef fine dining 2025",
  "Michelin star restaurants Washington DC USA chef 2025",
  // Middle East & Africa
  "Michelin star restaurants Dubai UAE chef fine dining 2025",
  "Michelin star restaurants Abu Dhabi UAE chef 2025",
  "Michelin star restaurants Cape Town South Africa chef 2025",
  "Michelin star restaurants Istanbul Turkey chef fine dining 2025",
  "Michelin star restaurants Tel Aviv Israel chef 2025",
  // Oceania
  "Michelin star restaurants Sydney Australia chef fine dining 2025",
  "Michelin star restaurants Melbourne Australia chef 2025",
  // World's 50 Best & specialty
  "World 50 Best Restaurants 2025 new entries chef",
  "World 50 Best Restaurants 2025 ranked list chef kitchen",
  "best pastry shops world 2025 patisserie chef",
  "best bakeries world boulangerie pastry chef 2025",
  "Michelin star restaurants countryside rural Europe chef 2025",
  "new Michelin star restaurants awarded 2025 chef",
  "Michelin star restaurants Scandinavia Nordic chef foraging 2025",
  "Michelin star restaurants Southeast Asia chef fine dining 2025",
  "Michelin star restaurants South America Latin chef 2025",
];

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface GroqRestaurant {
  name: string;
  city: string;
  country: string;
  stars: number;
  head_chef: string;
  cuisine_style: string;
  website_url: string;
  careers_email: string;
  world_50_rank: number | null;
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
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TavilyResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function extractRestaurants(
  query: string,
  results: TavilyResult[]
): Promise<GroqRestaurant[]> {
  const context = results
    .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
    .join("\n\n---\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a data extractor for a chef job application platform. Extract restaurant information ONLY from the provided search results. Return valid JSON.",
      },
      {
        role: "user",
        content: `Search query: "${query}"

Web search results:

${context}

Extract ALL restaurants, fine dining establishments, pastry shops, and notable culinary venues from these results.

Include if it meets ANY of these:
- Has Michelin stars (1, 2, or 3)
- Is in World's 50 Best Restaurants
- Is run by an internationally recognised chef
- Is a renowned fine dining destination
- Is a notable pastry kitchen, boulangerie, or pâtisserie

For EACH restaurant, return:
{
  "name": "exact name",
  "city": "city",
  "country": "full country name (e.g. United States, United Kingdom, not USA/UK)",
  "stars": 0-3 (Michelin stars, 0 if unknown or none),
  "head_chef": "chef name or empty string",
  "cuisine_style": "cuisine type or empty string",
  "website_url": "URL if available or empty string",
  "careers_email": "email if available or empty string",
  "world_50_rank": number or null
}

Return: { "restaurants": [...] }
Extract as many as you can find. If none qualify, return empty array.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '{"restaurants":[]}';
  try {
    const parsed = JSON.parse(text) as { restaurants?: GroqRestaurant[] };
    return Array.isArray(parsed.restaurants) ? parsed.restaurants : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { batch?: number } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const batch = Math.max(0, body.batch ?? 0);
  const totalQueries = DISCOVER_QUERIES.length;

  // Pick 2 queries per batch, cycling through the list
  const idx1 = (batch * 2) % totalQueries;
  const idx2 = (batch * 2 + 1) % totalQueries;
  const queries = [DISCOVER_QUERIES[idx1], DISCOVER_QUERIES[idx2]];

  // Run searches in parallel
  const searchResults = await Promise.all(queries.map((q) => tavilySearch(q)));

  // Deduplicate results by URL
  const seen = new Set<string>();
  const allResults: TavilyResult[] = [];
  for (const results of searchResults) {
    for (const r of results) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }
  }

  if (allResults.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  // Extract restaurants from combined results
  const found = await extractRestaurants(queries.join(" + "), allResults);

  if (found.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const supabase = createServerSupabase();

  const toTitleCase = (s: string) =>
    s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  // Normalize country names
  const COUNTRY_MAP: Record<string, string> = {
    USA: "United States",
    US: "United States",
    UK: "United Kingdom",
    UAE: "United Arab Emirates",
  };

  const rows = found.map((r) => ({
    name: toTitleCase(r.name.trim()),
    city: r.city.trim(),
    country: COUNTRY_MAP[r.country.trim()] ?? r.country.trim(),
    stars: Math.min(3, Math.max(0, Number(r.stars) || 0)),
    head_chef: r.head_chef || null,
    cuisine_style: r.cuisine_style || null,
    website_url: r.website_url && r.website_url.startsWith("http") ? r.website_url : null,
    careers_email: r.careers_email || null,
    world_50_rank: r.world_50_rank || null,
  }));

  try {
    const { data } = await supabase
      .from("restaurants")
      .upsert(rows, { onConflict: "name,city", ignoreDuplicates: true })
      .select("id");

    return NextResponse.json({ added: data?.length ?? 0, batch });
  } catch {
    return NextResponse.json({ added: 0 });
  }
}
