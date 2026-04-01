import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/tools/send-email";

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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, user_type, applications_remaining")
    .eq("user_id", session.user.email)
    .single();

  // Application limit gate — blocks free_trial and chef users at 0 remaining.
  // Institute users have applications_remaining = null so they're never blocked.
  if (profile?.applications_remaining === 0) {
    return NextResponse.json({ error: "no_applications_remaining" }, { status: 402 });
  }

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

    // Decrement applications_remaining for any finite-quota user (free_trial or chef)
    if (profile && profile.applications_remaining !== null) {
      await supabase
        .from("user_profiles")
        .update({ applications_remaining: profile.applications_remaining - 1 })
        .eq("user_id", session.user.email);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
