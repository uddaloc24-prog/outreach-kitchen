import type { PricingRegion } from "./geo-pricing";

export type TierKey = "starter" | "pro" | "elite";

export interface TierPricing {
  /** Amount in smallest currency unit (cents / paise) */
  amount: number;
  currency: string;
  /** Formatted for display, e.g. "$15" or "₹299" */
  display: string;
  /** Dodo Payments product ID for this tier + region */
  dodoProductId: string;
}

export interface RegionPricing {
  starter: TierPricing;
  pro: TierPricing;
  elite: TierPricing;
}

export const TIER_META: Record<TierKey, { label: string; applications: number; features: string[] }> = {
  starter: {
    label: "Starter",
    applications: 30,
    features: [
      "30 personalised cover emails / month",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
    ],
  },
  pro: {
    label: "Pro",
    applications: 50,
    features: [
      "50 personalised cover emails / month",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
      "Follow-up reminders at 21 days",
    ],
  },
  elite: {
    label: "Elite",
    applications: 120,
    features: [
      "120 personalised cover emails / month",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
      "Follow-up reminders at 21 days",
      "Search & add any kitchen worldwide",
    ],
  },
};

/**
 * Pricing data without Dodo product IDs — safe to evaluate at module level.
 * Product IDs must be read at request time via getPricing() since env vars
 * are not available at build time on Vercel.
 */
const PRICING_STATIC: Record<PricingRegion, Record<TierKey, Omit<TierPricing, "dodoProductId">>> = {
  us: {
    starter: { amount: 1500, currency: "USD", display: "$15" },
    pro:     { amount: 3500, currency: "USD", display: "$35" },
    elite:   { amount: 6500, currency: "USD", display: "$65" },
  },
  europe: {
    starter: { amount: 1200, currency: "EUR", display: "€12" },
    pro:     { amount: 2900, currency: "EUR", display: "€29" },
    elite:   { amount: 5500, currency: "EUR", display: "€55" },
  },
  india: {
    starter: { amount: 89900, currency: "INR", display: "₹899" },
    pro:     { amount: 149900, currency: "INR", display: "₹1,499" },
    elite:   { amount: 249900, currency: "INR", display: "₹2,499" },
  },
  row: {
    starter: { amount: 1499, currency: "USD", display: "$14.99" },
    pro:     { amount: 2499, currency: "USD", display: "$24.99" },
    elite:   { amount: 3999, currency: "USD", display: "$39.99" },
  },
};

/** Env var keys for each region + tier */
const PRODUCT_ID_KEYS: Record<PricingRegion, Record<TierKey, string>> = {
  us:     { starter: "DODO_PRODUCT_US_STARTER", pro: "DODO_PRODUCT_US_PRO", elite: "DODO_PRODUCT_US_ELITE" },
  europe: { starter: "DODO_PRODUCT_EU_STARTER", pro: "DODO_PRODUCT_EU_PRO", elite: "DODO_PRODUCT_EU_ELITE" },
  india:  { starter: "DODO_PRODUCT_IN_STARTER", pro: "DODO_PRODUCT_IN_PRO", elite: "DODO_PRODUCT_IN_ELITE" },
  row:    { starter: "DODO_PRODUCT_ROW_STARTER", pro: "DODO_PRODUCT_ROW_PRO", elite: "DODO_PRODUCT_ROW_ELITE" },
};

/**
 * Build full pricing with Dodo product IDs at request time.
 * Call this in API routes / server components — never at module level.
 */
export function getPricing(): Record<PricingRegion, RegionPricing> {
  const result = {} as Record<PricingRegion, RegionPricing>;
  for (const region of Object.keys(PRICING_STATIC) as PricingRegion[]) {
    result[region] = {} as RegionPricing;
    for (const tier of Object.keys(PRICING_STATIC[region]) as TierKey[]) {
      result[region][tier] = {
        ...PRICING_STATIC[region][tier],
        dodoProductId: process.env[PRODUCT_ID_KEYS[region][tier]] ?? "",
      };
    }
  }
  return result;
}

/** Static pricing (no product IDs) for display-only contexts like the pricing page */
export const PRICING = PRICING_STATIC as Record<PricingRegion, Record<TierKey, Omit<TierPricing, "dodoProductId"> & { dodoProductId?: string }>>;

/** Map Dodo product ID back to tier key (used by webhook handler) */
export function tierFromProductId(productId: string): TierKey | null {
  const pricing = getPricing();
  for (const region of Object.values(pricing)) {
    for (const [tier, config] of Object.entries(region)) {
      if (config.dodoProductId === productId) return tier as TierKey;
    }
  }
  return null;
}

/** Get application limit for a tier */
export function applicationsForTier(tier: TierKey): number {
  return TIER_META[tier].applications;
}
