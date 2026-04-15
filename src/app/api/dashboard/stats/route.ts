import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const userId = session.user.email;

  const [{ count: total }, { data: logs }, { data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("restaurants").select("*", { count: "exact", head: true }),
    supabase.from("outreach_log").select("status").eq("user_id", userId),
    supabase.from("user_profiles").select("user_type, applications_remaining").eq("user_id", userId).single(),
    supabase.from("user_subscriptions").select("tier, status, applications_limit, applications_used, current_period_end").eq("user_email", userId).single(),
  ]);

  const counts = (logs ?? []).reduce(
    (acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // For Dodo subscribers, derive applications_remaining from the subscription record
  const applicationsRemaining = subscription?.status === "active"
    ? subscription.applications_limit - subscription.applications_used
    : profile?.applications_remaining ?? null;

  // Count 3-star Michelin apps sent (for free trial limit display)
  let threeStarSent = 0;
  if (profile?.user_type === "free_trial") {
    const { count } = await supabase
      .from("outreach_log")
      .select("id, restaurants!inner(stars)", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent")
      .eq("restaurants.stars", 3);
    threeStarSent = count ?? 0;
  }

  return NextResponse.json({
    total: total ?? 0,
    sent: counts["sent"] ?? 0,
    replied: counts["replied"] ?? 0,
    followup_due: counts["followup_due"] ?? 0,
    draft_ready: counts["draft_ready"] ?? 0,
    researching: counts["researching"] ?? 0,
    user_type: profile?.user_type ?? "institute",
    applications_remaining: applicationsRemaining,
    subscription: subscription ?? null,
    three_star_sent: threeStarSent,
  });
}
