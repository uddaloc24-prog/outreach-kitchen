export type PricingRegion = "us" | "europe" | "india" | "row";

const REGION_MAP: Record<string, PricingRegion> = {
  // US region
  US: "us",
  CA: "us",
  AU: "us",
  NZ: "us",

  // Europe region
  GB: "europe",
  DE: "europe",
  FR: "europe",
  IT: "europe",
  ES: "europe",
  NL: "europe",
  BE: "europe",
  AT: "europe",
  CH: "europe",
  SE: "europe",
  NO: "europe",
  DK: "europe",
  FI: "europe",
  IE: "europe",
  PT: "europe",
  PL: "europe",
  CZ: "europe",
  RO: "europe",
  HU: "europe",
  GR: "europe",
  HR: "europe",
  BG: "europe",
  SK: "europe",
  SI: "europe",
  LT: "europe",
  LV: "europe",
  EE: "europe",
  LU: "europe",
  MT: "europe",
  CY: "europe",

  // India region
  IN: "india",
};

export function getRegionFromCountry(countryCode: string): PricingRegion {
  return REGION_MAP[countryCode] ?? "row";
}

/** Human-readable region labels for UI */
export const REGION_LABELS: Record<PricingRegion, string> = {
  us: "United States",
  europe: "Europe",
  india: "India",
  row: "International",
};
