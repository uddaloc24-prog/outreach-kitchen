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

  const [{ data: restaurants, error }, { data: logs }] = await Promise.all([
    supabase.from("restaurants").select("*").order("stars", { ascending: false }).order("name"),
    supabase.from("outreach_log").select("*").eq("user_id", userId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach only the current user's outreach log to each restaurant
  const logMap = new Map((logs ?? []).map((l) => [l.restaurant_id, l]));
  const result = (restaurants ?? []).map((r) => ({
    ...r,
    outreach_log: logMap.get(r.id) ?? null,
  }));

  return NextResponse.json({ restaurants: result });
}
