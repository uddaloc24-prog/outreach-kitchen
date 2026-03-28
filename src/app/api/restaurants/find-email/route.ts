import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

function extractEmails(text: string): string[] {
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
  // Emails from an unrelated domain are untrustworthy — rank them 0
  if (restaurantDomain && domain && !domain.includes(restaurantDomain) && !restaurantDomain.includes(domain)) {
    return 0;
  }
  const careerWords = ["career", "job", "apply", "recruit", "hr", "employ", "chef", "kitchen", "stage", "cv", "work"];
  const contactWords = ["info", "contact", "hello", "team", "general", "enqui", "reserv", "book"];
  if (careerWords.some((k) => email.includes(k))) return 3;
  if (contactWords.some((k) => email.includes(k))) return 2;
  return 1;
}

async function tavilySearchEmails(name: string, city: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const queries = [
    `"${name}" ${city} chef application email careers contact`,
    `"${name}" restaurant email apply cv kitchen job`,
  ];

  const found: string[] = [];

  for (const query of queries) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: 8,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { results?: Array<{ content: string }> };
      for (const r of data.results ?? []) {
        found.push(...extractEmails(r.content));
      }
      if (found.length >= 3) break;
    } catch {
      continue;
    }
  }

  return found;
}

async function scrapePageForEmails(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Prefer mailto: links — most reliable
    const mailtoMatches = [...html.matchAll(/href="mailto:([^"?]+)/gi)];
    const mailtoEmails = mailtoMatches.map((m) => m[1].trim().toLowerCase());
    const textEmails = extractEmails(html.replace(/<[^>]*>/g, " "));
    return [...new Set([...mailtoEmails, ...textEmails])];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { restaurant_id, manual_email } = body as {
    restaurant_id: string;
    manual_email?: string;
  };

  if (!restaurant_id) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurant_id)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Manual override — save directly and return immediately
  if (manual_email) {
    const clean = manual_email.trim().toLowerCase();
    await supabase.from("restaurants").update({ careers_email: clean }).eq("id", restaurant_id);
    return NextResponse.json({ email: clean, emails: [clean], found: true });
  }

  // Run Tavily web search AND website scraping in parallel
  const pagesToScrape = restaurant.website_url
    ? ["/contact", "/careers", "/jobs", "/about", "/"].map(
        (path) => `${restaurant.website_url!.replace(/\/$/, "")}${path}`
      )
    : [];

  const [webEmails, siteEmailArrays] = await Promise.all([
    tavilySearchEmails(restaurant.name, restaurant.city ?? ""),
    Promise.all(pagesToScrape.map(scrapePageForEmails)),
  ]);

  const siteEmails = siteEmailArrays.flat();
  // Extract restaurant's own domain to filter out unrelated emails
  let restaurantDomain: string | undefined;
  try {
    if (restaurant.website_url) {
      restaurantDomain = new URL(restaurant.website_url).hostname.replace(/^www\./, "");
    }
  } catch {
    // ignore malformed URL
  }

  const combined = [...new Set([...webEmails, ...siteEmails])];
  // Discard emails from unrelated domains — they are almost certainly wrong
  const trusted = combined.filter((e) => rankEmail(e, restaurantDomain) > 0);
  trusted.sort((a, b) => rankEmail(b, restaurantDomain) - rankEmail(a, restaurantDomain));
  const top = trusted.slice(0, 5);

  if (top.length === 0) {
    return NextResponse.json({ email: null, emails: [], found: false });
  }

  // Save the best email to DB
  await supabase.from("restaurants").update({ careers_email: top[0] }).eq("id", restaurant_id);

  return NextResponse.json({ email: top[0], emails: top, found: true });
}
