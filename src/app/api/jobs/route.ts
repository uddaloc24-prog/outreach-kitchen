import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { ScrapeStatus } from "@/types/jobs";

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minute cooldown

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Scrape status
  const { data: scrapeRow } = await supabase
    .from("scrape_log")
    .select("last_scraped_at")
    .eq("id", "jobs")
    .maybeSingle();

  const lastScrapedAt: string | null = scrapeRow?.last_scraped_at ?? null;
  const elapsed = lastScrapedAt ? Date.now() - new Date(lastScrapedAt).getTime() : Infinity;
  const canRefresh = elapsed >= COOLDOWN_MS;
  const secondsUntilRefresh = canRefresh ? 0 : Math.ceil((COOLDOWN_MS - elapsed) / 1000);

  const scrapeStatus: ScrapeStatus = {
    last_scraped_at: lastScrapedAt,
    can_refresh: canRefresh,
    seconds_until_refresh: secondsUntilRefresh,
  };

  // Fetch active listings — sorted server-side
  const { data: jobs, error } = await supabase
    .from("job_listings")
    .select("*")
    .eq("is_active", true)
    .order("restaurant_stars", { ascending: false })
    .order("scraped_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs ?? [], scrape_status: scrapeStatus });
}
