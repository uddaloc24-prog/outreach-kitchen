import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { researchRestaurant } from "@/lib/tools/research-restaurant";
import { generateResearchBrief } from "@/lib/tools/generate-research-brief";
import type { ResearchBrief, ParsedProfile } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.email;

  let body: { restaurant_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { restaurant_id } = body;
  if (!restaurant_id) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("parsed_profile, user_type, applications_remaining")
    .eq("user_id", userId)
    .single();

  if (!profileRow?.parsed_profile) {
    return NextResponse.json(
      { error: "Upload your CV first before researching a restaurant" },
      { status: 400 }
    );
  }

  // Quota gate — block users with no applications remaining
  if (profileRow.applications_remaining !== null && profileRow.applications_remaining <= 0) {
    return NextResponse.json({ error: "no_applications_remaining" }, { status: 402 });
  }

  const userProfile = profileRow.parsed_profile as ParsedProfile;

  const { data: restaurant, error: fetchErr } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurant_id)
    .single();

  if (fetchErr || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const { data: log, error: logErr } = await supabase
    .from("outreach_log")
    .upsert(
      {
        restaurant_id,
        user_id: userId,
        status: "researching",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,user_id" }
    )
    .select()
    .single();

  if (logErr || !log) {
    const detail = logErr?.message ?? "unknown error";
    const hint = detail.includes("user_id") || detail.includes("constraint")
      ? "Run migration 005 in Supabase SQL Editor: ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS user_id TEXT; then add the unique constraint."
      : detail;
    return NextResponse.json({ error: `Failed to create outreach log: ${hint}` }, { status: 500 });
  }

  try {
    const rawResearch = await researchRestaurant({
      restaurant_id,
      website_url: restaurant.website_url ?? "",
      restaurant_name: restaurant.name,
      head_chef: restaurant.head_chef ?? "",
    });

    const scrapedEmail = rawResearch.emails_found?.[0] ?? null;
    if (scrapedEmail && scrapedEmail !== restaurant.careers_email) {
      await supabase
        .from("restaurants")
        .update({ careers_email: scrapedEmail })
        .eq("id", restaurant_id);
      restaurant.careers_email = scrapedEmail;
    }

    const brief = await generateResearchBrief({
      restaurant_name: restaurant.name,
      raw_research: rawResearch,
      user_profile: userProfile,
    });

    await supabase
      .from("outreach_log")
      .update({
        status: "draft_ready",
        research_brief: brief as unknown as ResearchBrief,
        updated_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return NextResponse.json({
      brief,
      outreach_log_id: log.id,
      careers_email: restaurant.careers_email,
      email_verified: !!scrapedEmail,
    });
  } catch (err) {
    await supabase
      .from("outreach_log")
      .update({ status: "not_contacted", updated_at: new Date().toISOString() })
      .eq("id", log.id);

    const message = err instanceof Error ? err.message : "Research pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
