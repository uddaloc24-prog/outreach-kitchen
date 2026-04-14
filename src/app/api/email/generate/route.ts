import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateEmail } from "@/lib/tools/generate-email";
import { canSendApplication } from "@/lib/subscription-guard";
import type { ParsedProfile } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.email;
  const { restaurant_id } = await req.json();
  if (!restaurant_id) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const [{ data: restaurant }, { data: log }, { data: profileRow }] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", restaurant_id).single(),
    supabase.from("outreach_log").select("*").eq("restaurant_id", restaurant_id).eq("user_id", userId).single(),
    supabase.from("user_profiles").select("parsed_profile").eq("user_id", userId).single(),
  ]);

  if (!restaurant || !log) {
    return NextResponse.json({ error: "Restaurant or outreach log not found" }, { status: 404 });
  }
  if (!log.research_brief) {
    return NextResponse.json({ error: "Research brief not found — run research first" }, { status: 400 });
  }
  if (!profileRow?.parsed_profile) {
    return NextResponse.json({ error: "Upload your CV first" }, { status: 400 });
  }

  // Unified quota check — covers institute, Dodo subscription, and legacy Stripe/free-trial
  const quota = await canSendApplication(userId);
  if (!quota.allowed) {
    return NextResponse.json({ error: "no_applications_remaining" }, { status: 402 });
  }

  try {
    const email = await generateEmail({
      restaurant_name: restaurant.name,
      careers_email: restaurant.careers_email ?? "",
      head_chef: restaurant.head_chef ?? "",
      research_brief: log.research_brief,
      user_profile: profileRow.parsed_profile as ParsedProfile,
    });

    await supabase
      .from("outreach_log")
      .update({
        email_subject: email.subject,
        email_body: email.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return NextResponse.json(email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
