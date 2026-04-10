import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { EmployerApplicationStatus } from "@/types";

const VALID_STATUSES: EmployerApplicationStatus[] = [
  "new",
  "interested",
  "not_a_fit",
  "interviewing",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { status: EmployerApplicationStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Verify employer owns the restaurant the application is for
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id, user_type")
    .eq("user_id", session.user.email)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.user_type !== "employer" || !profile.employer_restaurant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the application belongs to this employer's restaurant
  const { data: log, error: logErr } = await supabase
    .from("outreach_log")
    .select("id, restaurant_id")
    .eq("id", id)
    .single();

  if (logErr || !log) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (log.restaurant_id !== profile.employer_restaurant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateErr } = await supabase
    .from("outreach_log")
    .update({ employer_status: body.status })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
