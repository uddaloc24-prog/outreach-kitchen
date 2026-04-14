import { NextRequest, NextResponse } from "next/server";
import { getRegionFromCountry, REGION_LABELS } from "@/lib/geo-pricing";
import { PRICING, TIER_META } from "@/lib/pricing-config";

export async function GET(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country") ?? "US";
  const region = getRegionFromCountry(country);
  const pricing = PRICING[region];

  return NextResponse.json({
    region,
    country,
    regionLabel: REGION_LABELS[region],
    currency: pricing.pro.currency,
    tiers: {
      starter: {
        display: pricing.starter.display,
        applications: TIER_META.starter.applications,
        features: TIER_META.starter.features,
      },
      pro: {
        display: pricing.pro.display,
        applications: TIER_META.pro.applications,
        features: TIER_META.pro.features,
      },
      elite: {
        display: pricing.elite.display,
        applications: TIER_META.elite.applications,
        features: TIER_META.elite.features,
      },
    },
  });
}
