import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** POST — track a referral sign-up. Called from the client after sign-in when a ref code is present. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    code?: string;
    referee_email?: string;
  };

  if (!body.code || !body.referee_email) {
    return NextResponse.json({ error: "Missing code or email" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Validate the referral code exists
  const { data: codeRow } = await supabase
    .from("referral_codes")
    .select("user_id, code")
    .eq("code", body.code)
    .single();

  if (!codeRow) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  // Don't let users refer themselves
  if (codeRow.user_id === body.referee_email) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Check if this referee was already tracked
  const { data: existing } = await supabase
    .from("referral_conversions")
    .select("id")
    .eq("referee_email", body.referee_email)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, already_tracked: true });
  }

  // Insert conversion
  const { error } = await supabase.from("referral_conversions").insert({
    referrer_id: codeRow.user_id,
    referee_email: body.referee_email,
    referral_code: codeRow.code,
    status: "signed_up",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
