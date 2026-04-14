import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getRegionFromCountry } from "@/lib/geo-pricing";
import { tierFromProductId, applicationsForTier } from "@/lib/pricing-config";

/**
 * Dodo Payments webhook handler.
 *
 * Webhook events reference:
 *   subscription.active   — subscription activated after successful payment
 *   subscription.renewed  — renewal for next billing period
 *   subscription.cancelled — user or system cancelled
 *   subscription.failed   — mandate creation failed
 *   subscription.on_hold  — renewal payment failed
 *   subscription.expired  — term ended
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    event_type?: string;
    type?: string;
    data?: {
      subscription_id?: string;
      product_id?: string;
      status?: string;
      next_billing_date?: string;
      current_period_end?: string;
      customer?: { email?: string; name?: string };
      billing?: { country?: string };
      metadata?: Record<string, string>;
    };
  };

  // Dodo may send event_type or type depending on webhook version
  const eventType = body.event_type ?? body.type;
  const data = body.data;

  if (!eventType || !data) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  // TODO: Verify webhook signature once Dodo publishes the verification method.
  // const signature = request.headers.get("x-dodo-signature");

  const supabase = createServerSupabase();

  switch (eventType) {
    case "subscription.active": {
      const email = data.customer?.email ?? data.metadata?.user_email;
      if (!email) break;

      const tier = data.metadata?.tier ?? tierFromProductId(data.product_id ?? "");
      if (!tier) break;

      const region =
        data.metadata?.region ??
        (data.billing?.country ? getRegionFromCountry(data.billing.country) : "us");

      const limit = applicationsForTier(tier as "starter" | "pro" | "elite");

      await supabase.from("user_subscriptions").upsert(
        {
          user_email: email,
          subscription_id: data.subscription_id ?? null,
          tier,
          status: "active",
          region,
          applications_limit: limit,
          applications_used: 0,
          current_period_end: data.next_billing_date ?? data.current_period_end ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" },
      );
      break;
    }

    case "subscription.renewed": {
      const subId = data.subscription_id;
      if (!subId) break;

      // Reset usage counter for the new billing period
      await supabase
        .from("user_subscriptions")
        .update({
          applications_used: 0,
          status: "active",
          current_period_end: data.next_billing_date ?? data.current_period_end ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", subId);
      break;
    }

    case "subscription.cancelled": {
      const subId = data.subscription_id;
      if (!subId) break;

      await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("subscription_id", subId);
      break;
    }

    case "subscription.failed": {
      const email = data.customer?.email ?? data.metadata?.user_email;
      if (!email) break;

      // Mark as inactive — mandate creation failed, subscription never started
      await supabase
        .from("user_subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("user_email", email);
      break;
    }

    case "subscription.on_hold": {
      const subId = data.subscription_id;
      if (!subId) break;

      await supabase
        .from("user_subscriptions")
        .update({ status: "on_hold", updated_at: new Date().toISOString() })
        .eq("subscription_id", subId);
      break;
    }

    case "subscription.expired": {
      const subId = data.subscription_id;
      if (!subId) break;

      await supabase
        .from("user_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("subscription_id", subId);
      break;
    }

    default:
      // Unhandled event — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
