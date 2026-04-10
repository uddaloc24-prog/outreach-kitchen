import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { EmployerApplication, EmployerStats } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Verify employer has a linked restaurant
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id, user_type")
    .eq("user_id", session.user.email)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.user_type !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile.employer_restaurant_id) {
    return NextResponse.json({ error: "No restaurant linked" }, { status: 403 });
  }

  // Fetch applications for this restaurant
  const { data: logs, error: logsErr } = await supabase
    .from("outreach_log")
    .select("*")
    .eq("restaurant_id", profile.employer_restaurant_id)
    .in("status", ["sent", "replied", "followup_due"])
    .order("sent_at", { ascending: false });

  if (logsErr) {
    return NextResponse.json({ error: logsErr.message }, { status: 500 });
  }

  const logList = logs ?? [];

  // Fetch chef profiles for each application
  const userIds = [...new Set(logList.map((l) => l.user_id))];

  let chefProfiles: Array<{
    user_id: string;
    name: string | null;
    slug: string | null;
    avatar_url: string | null;
    parsed_profile: import("@/types").ParsedProfile | null;
  }> = [];

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, name, slug, avatar_url, parsed_profile")
      .in("user_id", userIds);
    chefProfiles = profiles ?? [];
  }

  const profileMap = new Map(chefProfiles.map((p) => [p.user_id, p]));

  const applications: EmployerApplication[] = logList.map((log) => {
    const chef = profileMap.get(log.user_id);
    return {
      id: log.id,
      restaurant_id: log.restaurant_id,
      user_id: log.user_id,
      status: log.status,
      employer_status: log.employer_status ?? null,
      email_subject: log.email_subject ?? null,
      email_body: log.email_body ?? null,
      sent_at: log.sent_at ?? null,
      created_at: log.created_at,
      chef_name: chef?.name ?? null,
      chef_slug: chef?.slug ?? null,
      chef_current_role: chef?.parsed_profile?.current_role ?? null,
      chef_avatar_url: chef?.avatar_url ?? null,
      chef_parsed_profile: chef?.parsed_profile ?? null,
    };
  });

  // Compute stats
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const stats: EmployerStats = {
    total_applications: applications.length,
    new_this_week: applications.filter(
      (a) => a.sent_at !== null && a.sent_at > oneWeekAgo
    ).length,
    interested: applications.filter((a) => a.employer_status === "interested").length,
    interviewing: applications.filter((a) => a.employer_status === "interviewing").length,
  };

  return NextResponse.json({ applications, stats });
}
