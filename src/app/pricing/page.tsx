import { Suspense } from "react";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getRegionFromCountry } from "@/lib/geo-pricing";
import { PRICING, TIER_META } from "@/lib/pricing-config";
import { PricingClient } from "./PricingClient";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);

  // Geo detection — Vercel provides x-vercel-ip-country on deployed requests.
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") ?? "US";
  const region = getRegionFromCountry(country);
  const regionPricing = PRICING[region];

  // Check institute user (unlimited)
  let isInstituteUser = false;
  if (session?.user?.email) {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("allowed_users")
      .select("email")
      .eq("email", session.user.email)
      .single();
    if (data) isInstituteUser = true;
  }

  // Build serialisable props for the client component
  const tiers = (["starter", "pro", "elite"] as const).map((key) => ({
    key,
    label: TIER_META[key].label,
    display: regionPricing[key].display,
    currency: regionPricing[key].currency,
    applications: TIER_META[key].applications,
    features: TIER_META[key].features,
  }));

  return (
    <Suspense>
      <PricingClient
        isInstituteUser={isInstituteUser}
        tiers={tiers}
      />
    </Suspense>
  );
}
