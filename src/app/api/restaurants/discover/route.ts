import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { callGroq } from "@/lib/groq";

const VALID_TYPES = [
  "fine_dining", "casual_dining", "bistro", "cafe_bakery",
  "hotel_restaurant", "popup", "local_eatery",
] as const;

/**
 * Rotating discovery queries covering ALL restaurant types.
 * Each batch picks 2 queries, cycling through the list.
 */
const DISCOVER_QUERIES = [
  // ── Fine Dining & Michelin ──────────────────────────────────────────
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
  "Michelin star restaurants Tokyo Japan chef kitchen 2025",
  "Michelin star restaurants Kyoto Japan kaiseki chef 2025",
  "Michelin star restaurants Bangkok Thailand chef fine dining 2025",
  "Michelin star restaurants Singapore chef fine dining 2025",
  "Michelin star restaurants Hong Kong chef fine dining 2025",
  "Michelin star restaurants Seoul South Korea chef 2025",
  "Michelin star restaurants New York USA chef fine dining 2025",
  "Michelin star restaurants Los Angeles California chef 2025",
  "Michelin star restaurants San Francisco California chef 2025",
  "Michelin star restaurants Chicago USA chef fine dining 2025",
  "Michelin star restaurants Dubai UAE chef fine dining 2025",
  "Michelin star restaurants Sydney Australia chef fine dining 2025",
  "World 50 Best Restaurants 2025 new entries chef",
  "World 50 Best Restaurants 2025 ranked list chef kitchen",
  "new Michelin star restaurants awarded 2025 chef",
  // ── Fine dining (non-Michelin) ──────────────────────────────────────
  "best fine dining restaurants Mexico City chef 2025",
  "fine dining restaurants Lima Peru chef gastronomy 2025",
  "fine dining restaurants Sao Paulo Brazil chef 2025",
  "fine dining restaurants Buenos Aires Argentina chef 2025",
  "fine dining restaurants Cape Town South Africa chef 2025",
  "fine dining restaurants Istanbul Turkey chef 2025",
  "fine dining restaurants Mumbai India chef 2025",
  "best fine dining restaurants Toronto Canada 2025",
  // ── Casual Dining ──────────────────────────────────────────────────
  "best casual dining restaurants London chef 2025",
  "popular casual restaurants New York chef 2025",
  "casual dining restaurants Tokyo chef 2025",
  "best casual dining restaurants Paris France 2025",
  "casual dining restaurants Barcelona Spain chef 2025",
  "best casual restaurants Melbourne Australia 2025",
  "popular casual dining restaurants Berlin Germany 2025",
  "best casual restaurants Singapore chef 2025",
  "casual dining restaurants Dubai UAE 2025",
  "popular casual restaurants Copenhagen Denmark 2025",
  "best casual dining restaurants Los Angeles 2025",
  "casual restaurants Amsterdam Netherlands chef 2025",
  "best casual dining Bangkok Thailand 2025",
  "popular casual restaurants Toronto Canada 2025",
  "casual dining restaurants Seoul South Korea 2025",
  // ── Bistros & Brasseries ───────────────────────────────────────────
  "best bistros Paris France chef 2025",
  "popular brasseries Lyon France chef 2025",
  "best bistro restaurants London United Kingdom 2025",
  "French bistros New York chef kitchen 2025",
  "best bistros Brussels Belgium 2025",
  "bistro restaurants Amsterdam Netherlands chef 2025",
  "best bistros Barcelona Spain 2025",
  "wine bistros Rome Italy chef 2025",
  "neighbourhood bistros Berlin Germany 2025",
  "best brasseries Zurich Switzerland 2025",
  "bistro restaurants Melbourne Australia 2025",
  "best bistros Tokyo Japan French 2025",
  "bistro restaurants San Francisco chef 2025",
  "popular bistros Copenhagen Denmark 2025",
  // ── Cafes & Bakeries ───────────────────────────────────────────────
  "best bakeries patisseries Paris chef baker 2025",
  "famous pastry shops world chef baker 2025",
  "best bakeries London artisan bread 2025",
  "best cafes bakeries Tokyo Japan 2025",
  "artisan bakeries Copenhagen Denmark 2025",
  "best patisseries New York pastry chef 2025",
  "best bakeries Rome Italy 2025",
  "artisan cafes Melbourne Australia baker 2025",
  "best bakeries Berlin Germany sourdough 2025",
  "famous bakeries Barcelona Spain 2025",
  "best cafes bakeries Singapore 2025",
  "pastry shops Seoul South Korea chef 2025",
  // ── Hotel Restaurants ──────────────────────────────────────────────
  "luxury hotel restaurants Paris chef fine dining 2025",
  "best hotel restaurants London chef 2025",
  "hotel dining rooms Tokyo chef 2025",
  "luxury hotel restaurants Dubai chef 2025",
  "best hotel restaurants New York chef 2025",
  "hotel restaurants Singapore chef fine dining 2025",
  "luxury hotel restaurants Rome Italy chef 2025",
  "hotel restaurants Bangkok Thailand chef 2025",
  "best hotel dining Hong Kong chef 2025",
  "luxury hotel restaurants Sydney Australia chef 2025",
  // ── Pop-ups & Residencies ─────────────────────────────────────────
  "pop-up restaurant chef residency London 2025",
  "restaurant pop-ups New York chef 2025",
  "pop-up dining experiences Tokyo 2025",
  "chef residencies Copenhagen Denmark 2025",
  "pop-up restaurants Melbourne Australia 2025",
  "supper clubs pop-ups Paris chef 2025",
  "pop-up kitchen events Barcelona 2025",
  "chef pop-ups Los Angeles 2025",
  // ── Local Eateries & Hidden Gems ──────────────────────────────────
  "best local restaurants London neighbourhood 2025",
  "hidden gem restaurants Tokyo chef 2025",
  "best neighbourhood restaurants Paris 2025",
  "local eateries New York chef food 2025",
  "hidden gem restaurants Barcelona Spain 2025",
  "best local restaurants Bangkok street food chef 2025",
  "neighbourhood restaurants Copenhagen 2025",
  "best local eateries Melbourne Australia 2025",
  "hidden gem restaurants Mexico City 2025",
  "best local restaurants Lisbon Portugal 2025",
  "neighbourhood eateries Berlin Germany 2025",
  "best local restaurants Lima Peru 2025",
  "hidden gem restaurants Seoul South Korea 2025",
  "local restaurants Singapore hawker chef 2025",
  "best neighbourhood restaurants Amsterdam 2025",
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
  restaurant_type: string;
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

  const systemPrompt = "You are a data extractor for a chef job application platform. Extract restaurant information ONLY from the provided search results. Return valid JSON.";

  const userPrompt = `Search query: "${query}"

Web search results:

${context}

Extract ALL restaurants and culinary establishments from these results.

Include if it meets ANY of these criteria:
- Has Michelin stars (1, 2, or 3)
- Is in World's 50 Best Restaurants
- Is a well-known fine dining restaurant
- Is a popular casual dining establishment
- Is a notable bistro, brasserie, or café
- Is a hotel restaurant with a dedicated kitchen team
- Is a bakery, pâtisserie, or café with kitchen staff
- Is a pop-up restaurant or chef residency
- Is a notable local eatery or neighbourhood restaurant

For EACH restaurant, return:
{
  "name": "exact restaurant name",
  "city": "city",
  "country": "full country name (e.g. United States, United Kingdom, not USA/UK)",
  "stars": 0-3 (Michelin stars, 0 if unknown or none),
  "head_chef": "chef name or empty string",
  "cuisine_style": "cuisine type or empty string",
  "website_url": "URL if available or empty string",
  "careers_email": "email if available or empty string",
  "restaurant_type": "one of: fine_dining, casual_dining, bistro, cafe_bakery, hotel_restaurant, popup, local_eatery",
  "world_50_rank": number or null
}

Classification guide for restaurant_type:
- fine_dining: High-end restaurants with tasting menus, sommelier service
- casual_dining: Mid-range restaurants with à la carte menus
- bistro: Bistros, brasseries, wine bars, neighbourhood French-style restaurants
- cafe_bakery: Cafés, bakeries, pâtisseries, artisan bread shops
- hotel_restaurant: Restaurants inside hotels with dedicated kitchen teams
- popup: Pop-up restaurants, chef residencies, supper clubs
- local_eatery: Neighbourhood spots, hidden gems, street food venues

Return: { "restaurants": [...] }
Extract as many as you can find. If none qualify, return empty array.`;

  const text = await callGroq(systemPrompt, userPrompt, 4096);
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
    return NextResponse.json({ added: 0, batch });
  }

  // Extract restaurants from combined results
  const found = await extractRestaurants(queries.join(" + "), allResults);

  if (found.length === 0) {
    return NextResponse.json({ added: 0, batch });
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
    restaurant_type: VALID_TYPES.includes(r.restaurant_type as typeof VALID_TYPES[number])
      ? r.restaurant_type
      : "fine_dining",
    world_50_rank: r.world_50_rank || null,
  }));

  try {
    const { data } = await supabase
      .from("restaurants")
      .upsert(rows, { onConflict: "name,city", ignoreDuplicates: true })
      .select("id");

    return NextResponse.json({ added: data?.length ?? 0, batch });
  } catch {
    return NextResponse.json({ added: 0, batch });
  }
}
