import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateFollowup } from "@/lib/tools/generate-followup";
import { sendEmail } from "@/lib/tools/send-email";
import { daysSince } from "@/lib/utils";
import type { ParsedProfile } from "@/types";

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

  const [{ data: log }, { data: profileRow }] = await Promise.all([
    supabase.from("outreach_log").select("*, restaurants(*)").eq("id", outreach_log_id).single(),
    supabase.from("user_profiles").select("parsed_profile, name").eq("user_id", session.user.email).single(),
  ]);

  if (!log) {
    return NextResponse.json({ error: "Outreach log not found" }, { status: 404 });
  }

  const restaurant = log.restaurants;
  const profile = profileRow?.parsed_profile as ParsedProfile | null;
  const days = log.sent_at ? daysSince(log.sent_at) : 21;

  try {
    const followUp = await generateFollowup({
      restaurant_name: restaurant.name,
      original_email_body: log.email_body ?? "",
      days_since_sent: days,
      user_name: profile?.name ?? profileRow?.name ?? session.user.name ?? "",
      user_email: session.user.email,
      user_phone: profile?.phone,
    });

    const result = await sendEmail({
      restaurant_id: log.restaurant_id,
      to_email: restaurant.careers_email,
      subject: followUp.subject,
      body: followUp.body,
      outreach_log_id,
      user_email: session.user.email,
      chef_name: profile?.name ?? profileRow?.name ?? session.user.name ?? "",
    });

    await supabase
      .from("outreach_log")
      .update({
        followup_sent: true,
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", outreach_log_id);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Follow-up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
