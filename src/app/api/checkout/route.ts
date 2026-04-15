import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRegionFromCountry } from "@/lib/geo-pricing";
import { getPricing, type TierKey } from "@/lib/pricing-config";

const VALID_TIERS: TierKey[] = ["starter", "pro", "elite"];

function dodoBaseUrl(): string {
  return process.env.DODO_TEST_MODE === "true"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { tier?: string };
  const tier = body.tier as TierKey;

  if (!tier || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const country = request.headers.get("x-vercel-ip-country") ?? "US";
  const region = getRegionFromCountry(country);
  const pricing = getPricing();
  const priceConfig = pricing[region][tier];

  if (!priceConfig.dodoProductId) {
    return NextResponse.json(
      { error: "Payment not configured for this region" },
      { status: 500 },
    );
  }

  const apiKey = process.env.DODO_TEST_MODE === "true"
    ? process.env.DODO_API_KEY_TEST
    : process.env.DODO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 500 },
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Use the Checkout Sessions API (recommended by Dodo)
  const response = await fetch(`${dodoBaseUrl()}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [
        {
          product_id: priceConfig.dodoProductId,
          quantity: 1,
        },
      ],
      customer: {
        email: session.user.email,
        name: session.user.name ?? "",
      },
      billing: {
        country,
      },
      return_url: `${baseUrl}/dashboard?checkout=success`,
      metadata: {
        tier,
        region,
        user_email: session.user.email,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Dodo checkout error:", response.status, errorData);
    console.error("Dodo request URL:", `${dodoBaseUrl()}/checkouts`);
    console.error("Dodo product_id:", priceConfig.dodoProductId);
    console.error("Dodo region:", region, "tier:", tier);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${response.status} — ${errorData}` },
      { status: 502 },
    );
  }

  const data = await response.json() as {
    session_id: string;
    checkout_url: string;
  };

  return NextResponse.json({
    checkoutUrl: data.checkout_url,
    sessionId: data.session_id,
  });
}
