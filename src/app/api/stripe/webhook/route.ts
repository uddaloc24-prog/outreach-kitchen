import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase-server";

const APPS_BY_PLAN: Record<string, number | null> = {
  starter:   30,
  pro:       50,
  unlimited: null,
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email;
  const plan = session.metadata?.plan as string | undefined;

  if (!email || !plan || !(plan in APPS_BY_PLAN)) {
    return NextResponse.json({ error: "Missing email or plan in session" }, { status: 400 });
  }

  const newApps = APPS_BY_PLAN[plan];
  const supabase = createServerSupabase();

  // Check if user already has a profile (upgrade case)
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("plan, applications_remaining")
    .eq("user_id", email)
    .single();

  let applications_remaining: number | null;

  if (existing?.plan && existing.plan !== plan) {
    // Upgrade: add the delta rather than replacing
    if (newApps === null) {
      applications_remaining = null; // any → unlimited
    } else {
      const oldApps = APPS_BY_PLAN[existing.plan] ?? 0;
      const delta = newApps - (typeof oldApps === "number" ? oldApps : 0);
      const current = existing.applications_remaining ?? 0;
      applications_remaining = current + delta;
    }
  } else {
    applications_remaining = newApps;
  }

  await supabase.from("user_profiles").upsert(
    {
      user_id: email,
      user_type: "chef",
      plan,
      applications_remaining,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ received: true });
}
