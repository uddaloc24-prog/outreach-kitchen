import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { callGroq } from "@/lib/groq";

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

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

// Step 1: Search Tavily for real web results about this restaurant
async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} chef kitchen restaurant bakery pastry`,
        search_depth: "basic",
        max_results: 8,
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

// Step 2: Ask Groq to extract structured restaurant data ONLY from the real search results
async function extractFromResults(
  query: string,
  results: TavilyResult[]
): Promise<GroqRestaurant[]> {
  const context = results
    .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = "You are a data extractor for a chef's job application tool. Extract restaurant information ONLY from the provided search results. Do NOT invent or add restaurants not mentioned in the results. Return valid JSON only.";

  const userPrompt = `The user searched for: "${query}"

Here are real web search results:

${context}

Extract ONLY world-class culinary establishments from these results that match the search query.

This tool is used by professional chefs applying for kitchen positions. Include any establishment where a serious chef would want to stage or work — including fine dining restaurants, pastry kitchens, bakeries, boulangeries, pâtisseries, and chocolatiers.

STRICT CRITERIA — only include an establishment if it meets at least one:
- Has Michelin stars (1, 2, or 3)
- Is ranked in the World's 50 Best Restaurants or World's 50 Best Pastry Shops
- Is run by an internationally recognised chef or pastry chef (e.g. Cédric Grolet, Dominique Ansel, Pierre Hermé, Christophe Adam, Nina Métayer)
- Is internationally renowned as a destination bakery, pâtisserie, boulangerie, or pastry kitchen
- Is a notable fine dining restaurant with an internationally known kitchen team

DO NOT include:
- Generic local bakeries, supermarket chains, or casual cafés with no international recognition
- Restaurants or bakeries with no known chef or no culinary reputation beyond their local area
- Anything not clearly described as a notable culinary destination in the search results

Only include establishments clearly described in the results above.
If no establishment meets these criteria, return an empty array — do not guess.

Return a JSON object with a "restaurants" array. Each item must have exactly these fields:
{
  "name": "exact restaurant name from results",
  "city": "city where the restaurant is located",
  "country": "country where the restaurant is located",
  "stars": 0 (no Michelin star) or 1, 2, or 3 (Michelin stars — only if explicitly mentioned),
  "head_chef": "head chef or pastry chef name if mentioned, otherwise empty string",
  "cuisine_style": "cuisine or establishment type (e.g. 'Pastry', 'Boulangerie', 'Pâtisserie', 'French fine dining') if mentioned, otherwise empty string",
  "website_url": "website URL from results if available, otherwise empty string",
  "careers_email": "careers or contact email if mentioned, otherwise empty string",
  "world_50_rank": integer if in World's 50 Best, otherwise null
}`;

  const text = await callGroq(systemPrompt, userPrompt, 2048);
  try {
    const parsed = JSON.parse(text) as { restaurants?: GroqRestaurant[] };
    return Array.isArray(parsed.restaurants) ? parsed.restaurants : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ restaurants: [] });
  }

  // 1. Search the real web with Tavily
  const webResults = await tavilySearch(q);

  if (webResults.length === 0) {
    return NextResponse.json({ restaurants: [] });
  }

  // 2. Extract structured restaurant data from real results
  const found = await extractFromResults(q, webResults);

  if (found.length === 0) {
    return NextResponse.json({ restaurants: [] });
  }

  const supabase = createServerSupabase();

  // 3. Upsert verified restaurants into DB (normalize name to title case to prevent case-variant duplicates)
  const toTitleCase = (s: string) =>
    s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  try {
    const { data } = await supabase
      .from("restaurants")
      .upsert(
        found.map((r) => ({
          name: toTitleCase(r.name.trim()),
          city: r.city,
          country: r.country,
          stars: Math.min(3, Math.max(0, Number(r.stars) || 0)),
          head_chef: r.head_chef || null,
          cuisine_style: r.cuisine_style || null,
          website_url: r.website_url || null,
          careers_email: r.careers_email || null,
          world_50_rank: r.world_50_rank || null,
        })),
        { onConflict: "name,city", ignoreDuplicates: true }
      )
      .select("*, outreach_log(*)");

    return NextResponse.json({ restaurants: data ?? [] });
  } catch {
    return NextResponse.json({ restaurants: [] });
  }
}
