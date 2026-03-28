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

  const [{ count: total }, { data: logs }] = await Promise.all([
    supabase.from("restaurants").select("*", { count: "exact", head: true }),
    supabase.from("outreach_log").select("status").eq("user_id", userId),
  ]);

  const counts = (logs ?? []).reduce(
    (acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    total: total ?? 0,
    sent: counts["sent"] ?? 0,
    replied: counts["replied"] ?? 0,
    followup_due: counts["followup_due"] ?? 0,
    draft_ready: counts["draft_ready"] ?? 0,
    researching: counts["researching"] ?? 0,
  });
}
