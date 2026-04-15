"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface TierData {
  display: string;
  applications: number;
  features: string[];
}

interface PricingResponse {
  tiers: {
    starter: TierData;
    pro: TierData;
    elite: TierData;
  };
}

interface FreeTrialModalProps {
  onContinue: () => void;
}

export function FreeTrialModal({ onContinue }: FreeTrialModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data: PricingResponse) => setPricing(data))
      .catch(() => {});
  }, []);

  const plans = pricing
    ? [
        { key: "starter", name: "Starter", highlight: false, ...pricing.tiers.starter },
        { key: "pro", name: "Pro", highlight: true, ...pricing.tiers.pro },
        { key: "elite", name: "Elite", highlight: false, ...pricing.tiers.elite },
      ]
    : null;

  async function handleBuy(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: planKey }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? "Something went wrong");
        setLoading(null);
      }
    } catch {
      alert("Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-end sm:items-center justify-center sm:p-6 overflow-y-auto">
      <div className="bg-parchment w-full sm:max-w-4xl border border-warm-border shadow-panel my-auto max-h-[95vh] overflow-y-auto rounded-t-xl sm:rounded-none">
        {/* Header */}
        <div className="px-5 sm:px-10 pt-6 sm:pt-10 pb-5 sm:pb-6 border-b border-warm-border text-center">
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Free Trial</p>
          <h2 className="font-display text-[24px] sm:text-[36px] font-light text-ink leading-tight">
            You have 3 free applications
          </h2>
          <p className="text-[13px] sm:text-body text-muted mt-3 max-w-lg mx-auto">
            Send three personalised cover emails to any kitchen — no payment needed.
            Includes one application to a 3-star Michelin restaurant. Upgrade any time for more.
          </p>
          <p className="text-[11px] text-muted/70 mt-2">
            Apply to any restaurant — no restrictions on your free trial.
          </p>
        </div>

        {/* Plans */}
        <div className="px-4 sm:px-10 py-6 sm:py-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted text-center mb-6">
            Or choose a plan to unlock more
          </p>

          {!plans ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={16} className="animate-spin text-muted" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-warm-border">
              {plans.map((plan, i) => (
                <div
                  key={plan.key}
                  className={`p-5 sm:p-8 flex flex-col ${i < plans.length - 1 ? "border-b sm:border-b-0 sm:border-r border-warm-border" : ""} ${plan.highlight ? "bg-ink text-parchment" : ""}`}
                >
                  {plan.highlight && (
                    <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-3">
                      Most popular
                    </p>
                  )}
                  <p className={`text-[12px] tracking-widest uppercase ${plan.highlight ? "text-parchment/70" : "text-muted"}`}>
                    {plan.name}
                  </p>
                  <p className={`font-display text-[52px] font-light mt-1 leading-none ${plan.highlight ? "text-parchment" : "text-ink"}`}>
                    {plan.display}
                  </p>
                  <p className={`text-[12px] mt-1 ${plan.highlight ? "text-parchment/70" : "text-muted"}`}>
                    {plan.applications} applications
                  </p>
                  <ul className="mt-6 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className={`text-[12px] flex items-start gap-2 ${plan.highlight ? "text-parchment/80" : "text-muted"}`}>
                        <span className="mt-0.5 shrink-0">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleBuy(plan.key)}
                    disabled={loading !== null}
                    className={`mt-8 w-full py-3 text-[12px] tracking-wide transition-colors disabled:opacity-50 ${
                      plan.highlight
                        ? "bg-parchment text-ink hover:bg-parchment/90"
                        : "border border-ink text-ink hover:bg-ink hover:text-parchment"
                    }`}
                  >
                    {loading === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Redirecting…
                      </span>
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue free */}
        <div className="px-5 sm:px-10 pb-8 sm:pb-10 text-center">
          <button
            onClick={onContinue}
            className="text-[13px] text-muted hover:text-ink transition-colors underline underline-offset-4"
          >
            Continue with 3 free emails →
          </button>
        </div>
      </div>
    </div>
  );
}
