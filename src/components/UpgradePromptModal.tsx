"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, X, Loader2 } from "lucide-react";
import type { RestaurantWithOutreach, RestaurantType } from "@/types";
import type { TierKey } from "@/lib/pricing-config";

const TYPE_LABELS: Record<RestaurantType, string> = {
  fine_dining: "Fine Dining",
  casual_dining: "Casual Dining",
  bistro: "Bistro",
  cafe_bakery: "Cafe & Bakery",
  hotel_restaurant: "Hotel Restaurant",
  popup: "Pop-up",
  local_eatery: "Local Eatery",
};

const TIER_LABELS: Record<string, string> = {
  pro: "Pro",
  elite: "Elite",
};

function restaurantDescription(r: RestaurantWithOutreach): string {
  if (r.world_50_rank) return `World's 50 Best #${r.world_50_rank}`;
  if (r.stars >= 2) return `${r.stars}★ Michelin`;
  if (r.stars === 1) return "1★ Michelin";
  return TYPE_LABELS[r.restaurant_type] ?? "Fine Dining";
}

function currentPlanDescription(tier: string | null): string {
  if (tier === "starter") return "Starter plan covers casual dining, bistros, cafes, and local eateries";
  if (tier === "pro") return "Pro plan covers up to 1★ Michelin restaurants";
  if (tier === "free_trial") return "Free trial includes 3 applications (max 1 three-star Michelin)";
  return "Your current plan covers casual dining, bistros, and local eateries";
}

interface UpgradePromptModalProps {
  restaurant: RestaurantWithOutreach;
  requiredTier: TierKey;
  currentTier: string | null;
  onClose: () => void;
}

interface TierPricingData {
  display: string;
  applications: number;
  features: string[];
}

export function UpgradePromptModal({
  restaurant,
  requiredTier,
  currentTier,
  onClose,
}: UpgradePromptModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<TierPricingData | null>(null);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data: { tiers: Record<string, TierPricingData> }) => {
        setPricing(data.tiers?.[requiredTier] ?? null);
      })
      .catch(() => {});
  }, [requiredTier]);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: requiredTier }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? "Something went wrong");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-end sm:items-center justify-center sm:p-6 overflow-y-auto">
      <div className="bg-parchment w-full sm:max-w-lg border border-warm-border shadow-panel my-auto max-h-[95vh] overflow-y-auto rounded-t-xl sm:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2 text-muted">
            <Lock size={16} />
            <span className="text-[11px] tracking-[0.2em] uppercase">Upgrade Required</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Restaurant info */}
        <div className="px-6 pt-4 pb-6 border-b border-warm-border">
          <h2 className="font-display text-[24px] sm:text-[28px] font-light text-ink leading-tight">
            This kitchen requires {TIER_LABELS[requiredTier] ?? "a higher plan"}
          </h2>
          <p className="text-[13px] text-muted mt-3">
            <strong className="text-ink">{restaurant.name}</strong> is a{" "}
            {restaurantDescription(restaurant)} restaurant.{" "}
            {currentPlanDescription(currentTier)}.
          </p>
        </div>

        {/* Upgrade card */}
        <div className="px-6 py-6">
          <div className="border border-ink bg-ink text-parchment p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/60">
              Upgrade to
            </p>
            <p className="text-[12px] tracking-widest uppercase text-parchment/70 mt-1">
              {TIER_LABELS[requiredTier]}
            </p>

            {pricing ? (
              <>
                <p className="font-display text-[40px] font-light mt-2 leading-none text-parchment">
                  {pricing.display}
                  <span className="text-[14px] text-parchment/60">/mo</span>
                </p>
                <p className="text-[12px] mt-1 text-parchment/70">
                  {pricing.applications} applications per month
                </p>
                <ul className="mt-5 space-y-2">
                  {pricing.features.map((f) => (
                    <li
                      key={f}
                      className="text-[12px] flex items-start gap-2 text-parchment/80"
                    >
                      <span className="mt-0.5 shrink-0 text-parchment/50">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-parchment/50" />
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading || !pricing}
              className="mt-6 w-full py-3 bg-parchment text-ink text-[12px] tracking-wide hover:bg-parchment/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Redirecting…
                </span>
              ) : (
                `Upgrade to ${TIER_LABELS[requiredTier]} →`
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              onClose();
              router.push(`/pricing?reason=restricted&tier=${requiredTier}`);
            }}
            className="text-[13px] text-ink underline underline-offset-2 hover:text-ink/70 transition-colors"
          >
            Compare all plans →
          </button>
          <button
            onClick={onClose}
            className="text-[13px] text-muted hover:text-ink transition-colors"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
