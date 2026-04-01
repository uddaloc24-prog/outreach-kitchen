import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const PLANS = {
  starter:   { price: 2900, apps: 30,   label: "Starter" },
  pro:       { price: 4900, apps: 50,   label: "Pro" },
  unlimited: { price: 7900, apps: null, label: "Unlimited" },
} as const;

type Plan = keyof typeof PLANS;

export async function POST(req: NextRequest) {
  const { plan } = await req.json() as { plan: Plan };

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });

  const session = await getServerSession(authOptions);
  const config = PLANS[plan];

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.price,
          product_data: {
            name: `Kitchen Applications — ${config.label} Plan`,
            description: config.apps
              ? `${config.apps} applications to kitchens worldwide`
              : "Unlimited applications to kitchens worldwide",
          },
        },
      },
    ],
    metadata: { plan },
    customer_email: session?.user?.email ?? undefined,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
