import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/api-error";

const bodySchema = z.object({
  status: z.enum(["sent", "replied", "followup_due"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, "standard", session.user.email);
  if (rl) return rl;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing outreach id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { status } = parsed.data;
  const supabase = createServerSupabase();
  const now = new Date().toISOString();

  const update: Record<string, string | null> = {
    status,
    updated_at: now,
  };
  if (status === "replied") update.replied_at = now;
  if (status === "sent") update.replied_at = null;

  const { data, error } = await supabase
    .from("outreach_log")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.user.email)
    .select("id, status, replied_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeError(error, "outreach/status") },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, outreach: data });
}
