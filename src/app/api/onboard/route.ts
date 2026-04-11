import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { role: UserRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role } = body;
  if (role !== "chef" && role !== "employer") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Check current profile to avoid downgrading paid/institute users
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("user_id", session.user.email)
    .single();

  const preserveType = existing?.user_type === "institute" || existing?.user_type === "chef";
  const user_type = role === "employer" ? "employer" : preserveType ? existing.user_type : "free_trial";

  const { error } = await supabase
    .from("user_profiles")
    .update({ user_type, has_chosen_role: true })
    .eq("user_id", session.user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user_type });
}
