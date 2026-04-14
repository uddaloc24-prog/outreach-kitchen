import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import crypto from "crypto";

/** GET — return the user's referral code + stats (create code if none exists) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const userId = session.user.email;

  // Get or create referral code
  let { data: codeRow } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!codeRow) {
    const code = crypto.randomBytes(4).toString("hex"); // 8-char hex code
    const { data: newRow, error } = await supabase
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    codeRow = newRow;
  }

  // Get conversion stats
  const { data: conversions } = await supabase
    .from("referral_conversions")
    .select("*")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  const stats = {
    total_referrals: conversions?.length ?? 0,
    signed_up: conversions?.filter((c) => c.status === "signed_up").length ?? 0,
    converted: conversions?.filter((c) => c.status === "first_application" || c.status === "rewarded").length ?? 0,
    rewarded: conversions?.filter((c) => c.status === "rewarded").length ?? 0,
    bonus_applications: (conversions?.filter((c) => c.status === "rewarded").length ?? 0) * 3,
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

  return NextResponse.json({
    code: codeRow.code,
    referral_url: `${baseUrl}/?ref=${codeRow.code}`,
    stats,
    conversions: conversions ?? [],
  });
}
