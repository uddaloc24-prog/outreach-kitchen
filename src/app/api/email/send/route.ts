import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/tools/send-email";
import { canSendApplication, incrementApplicationCount, canAccessRestaurant } from "@/lib/subscription-guard";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { outreach_log_id } = await req.json();
  if (!outreach_log_id) {
    return NextResponse.json({ error: "outreach_log_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: log } = await supabase
    .from("outreach_log")
    .select("*, restaurants(*)")
    .eq("id", outreach_log_id)
    .single();

  if (!log) {
    return NextResponse.json({ error: "Outreach log not found" }, { status: 404 });
  }

  if (!log.email_subject || !log.email_body) {
    return NextResponse.json(
      { error: "Email not generated yet — generate email first" },
      { status: 400 }
    );
  }

  const restaurant = log.restaurants;
  if (!restaurant?.careers_email) {
    return NextResponse.json({ error: "No careers email for this restaurant" }, { status: 400 });
  }

  // Check restaurant type/tier access
  const accessCheck = await canAccessRestaurant(session.user.email, {
    restaurant_type: restaurant.restaurant_type ?? "fine_dining",
    stars: restaurant.stars,
    world_50_rank: restaurant.world_50_rank,
  });
  if (!accessCheck.allowed) {
    return NextResponse.json(
      {
        error: "restaurant_restricted",
        reason: accessCheck.reason,
        requiredTier: accessCheck.requiredTier,
      },
      { status: 403 }
    );
  }

  // Unified quota check — covers institute, Dodo subscription, and legacy Stripe/free-trial
  const quota = await canSendApplication(session.user.email);
  if (!quota.allowed) {
    return NextResponse.json({ error: "no_applications_remaining" }, { status: 402 });
  }

  // Decrement / increment BEFORE sending to prevent race conditions
  const decremented = await incrementApplicationCount(session.user.email);
  if (!decremented) {
    return NextResponse.json({ error: "no_applications_remaining" }, { status: 402 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("user_id", session.user.email)
    .single();

  try {
    const result = await sendEmail({
      restaurant_id: log.restaurant_id,
      to_email: restaurant.careers_email,
      subject: log.email_subject,
      body: log.email_body,
      outreach_log_id,
      user_email: session.user.email,
      chef_name: profile?.name ?? session.user.name ?? "",
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
