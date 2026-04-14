"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";

interface TierInfo {
  key: string;
  label: string;
  display: string;
  currency: string;
  applications: number;
  features: string[];
}

interface PricingClientProps {
  isInstituteUser: boolean;
  tiers: TierInfo[];
}

export function PricingClient({
  isInstituteUser,
  tiers,
}: PricingClientProps) {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const hitLimit = reason === "limit";
  const isRestricted = reason === "restricted";
  const suggestedTier = searchParams.get("tier");
  const [loading, setLoading] = useState<string | null>(null);
  async function handleBuy(tierKey: string) {
    setLoading(tierKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
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

  // Highlight the tier from the URL param, or default to pro
  const highlightTier = suggestedTier === "elite" ? "elite" : "pro";

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="font-display text-[36px] sm:text-[56px] font-light text-ink leading-tight">
            Apply to the world&apos;s best kitchens
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted mt-4 max-w-xl mx-auto">
            Monthly subscription. Cancel anytime. Your personalised cover emails go out
            under your name, from your Gmail account.
          </p>
        </div>

        {hitLimit && !isInstituteUser && (
          <div className="border border-warm-border p-5 text-center mb-8">
            <p className="text-[14px] text-ink">
              You&apos;ve used your free application. Choose a plan to keep sending.
            </p>
          </div>
        )}

        {isRestricted && !isInstituteUser && (
          <div className="border border-gold/40 bg-gold/5 p-5 text-center mb-8">
            <p className="text-[14px] text-ink">
              The restaurant you selected requires{" "}
              <strong>{suggestedTier === "elite" ? "Elite" : "Pro"}</strong>.
              {suggestedTier === "elite"
                ? " 2★ & 3★ Michelin and World's 50 Best restaurants are exclusive to Elite."
                : " Fine dining, hotel restaurants, and 1★ Michelin are available from Pro."}
            </p>
          </div>
        )}

        {isInstituteUser ? (
          <div className="border border-warm-border p-10 text-center max-w-md mx-auto">
            <p className="font-display text-[24px] font-light text-ink">
              You have unlimited access
            </p>
            <p className="text-[14px] text-muted mt-2">
              Your account has no sending limits.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-[13px] tracking-wide border border-ink px-6 py-3 text-ink hover:bg-ink hover:text-parchment transition-colors"
            >
              Go to Restaurant List
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-warm-border">
            {tiers.map((tier, i) => {
              const isHighlight = tier.key === highlightTier;
              return (
                <div
                  key={tier.key}
                  className={`p-8 sm:p-10 flex flex-col ${
                    i < tiers.length - 1
                      ? "border-b sm:border-b-0 sm:border-r border-warm-border"
                      : ""
                  } ${isHighlight ? "bg-ink text-parchment" : ""}`}
                >
                  {isHighlight && (
                    <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-4">
                      Most popular
                    </p>
                  )}
                  <p
                    className={`text-[13px] tracking-widest uppercase ${
                      isHighlight ? "text-parchment/70" : "text-muted"
                    }`}
                  >
                    {tier.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <p
                      className={`font-display text-[48px] sm:text-[64px] font-light leading-none ${
                        isHighlight ? "text-parchment" : "text-ink"
                      }`}
                    >
                      {tier.display}
                    </p>
                    <span
                      className={`text-[13px] ${
                        isHighlight ? "text-parchment/50" : "text-muted"
                      }`}
                    >
                      /mo
                    </span>
                  </div>
                  <p
                    className={`text-[13px] mt-1 ${
                      isHighlight ? "text-parchment/70" : "text-muted"
                    }`}
                  >
                    {tier.applications} applications
                  </p>

                  <ul className="mt-8 space-y-3 flex-1">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className={`text-[13px] flex items-start gap-2 ${
                          isHighlight ? "text-parchment/80" : "text-muted"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">&mdash;</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuy(tier.key)}
                    disabled={loading !== null}
                    className={`mt-10 w-full py-3 text-[13px] tracking-wide transition-colors disabled:opacity-50 ${
                      isHighlight
                        ? "bg-parchment text-ink hover:bg-parchment/90"
                        : "border border-ink text-ink hover:bg-ink hover:text-parchment"
                    }`}
                  >
                    {loading === tier.key ? "Redirecting\u2026" : `Subscribe to ${tier.label}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[12px] text-muted mt-8">
          Payments processed securely by Dodo Payments. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
