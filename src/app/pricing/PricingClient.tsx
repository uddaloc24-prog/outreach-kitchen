"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";

interface Plan {
  key: string;
  name: string;
  price: string;
  apps: string;
  features: string[];
  highlight: boolean;
}

const PLANS: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    price: "$29",
    apps: "30 applications",
    features: [
      "30 personalised cover emails",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
    ],
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    apps: "50 applications",
    features: [
      "50 personalised cover emails",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
      "Follow-up reminders at 21 days",
    ],
    highlight: true,
  },
  {
    key: "unlimited",
    name: "Unlimited",
    price: "$79",
    apps: "Unlimited applications",
    features: [
      "Unlimited personalised cover emails",
      "AI research brief per restaurant",
      "Gmail send via your own account",
      "Dashboard & reply tracking",
      "Follow-up reminders at 21 days",
      "Search & add any kitchen worldwide",
    ],
    highlight: false,
  },
];

interface PricingClientProps {
  isInstituteUser: boolean;
}

export function PricingClient({ isInstituteUser }: PricingClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
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
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display text-[56px] font-light text-ink leading-tight">
            Apply to the world&apos;s best kitchens
          </h1>
          <p className="text-body text-muted mt-4 max-w-xl mx-auto">
            One-time payment. No subscription. Your personalised cover emails go out
            under your name, from your Gmail account.
          </p>
        </div>

        {isInstituteUser ? (
          <div className="border border-warm-border p-10 text-center max-w-md mx-auto">
            <p className="font-display text-[24px] font-light text-ink">
              You have unlimited access
            </p>
            <p className="text-body text-muted mt-2">
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
          <div className="grid grid-cols-3 gap-0 border border-warm-border">
            {PLANS.map((plan, i) => (
              <div
                key={plan.key}
                className={`p-10 flex flex-col ${i < PLANS.length - 1 ? "border-r border-warm-border" : ""} ${plan.highlight ? "bg-ink text-parchment" : ""}`}
              >
                {plan.highlight && (
                  <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-4">
                    Most popular
                  </p>
                )}
                <p className={`text-[13px] tracking-widest uppercase ${plan.highlight ? "text-parchment/70" : "text-muted"}`}>
                  {plan.name}
                </p>
                <p className={`font-display text-[64px] font-light mt-2 leading-none ${plan.highlight ? "text-parchment" : "text-ink"}`}>
                  {plan.price}
                </p>
                <p className={`text-[13px] mt-1 ${plan.highlight ? "text-parchment/70" : "text-muted"}`}>
                  {plan.apps}
                </p>

                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-[13px] flex items-start gap-2 ${plan.highlight ? "text-parchment/80" : "text-muted"}`}>
                      <span className="mt-0.5 shrink-0">—</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleBuy(plan.key)}
                  disabled={loading !== null}
                  className={`mt-10 w-full py-3 text-[13px] tracking-wide transition-colors disabled:opacity-50 ${
                    plan.highlight
                      ? "bg-parchment text-ink hover:bg-parchment/90"
                      : "border border-ink text-ink hover:bg-ink hover:text-parchment"
                  }`}
                >
                  {loading === plan.key ? "Redirecting…" : `Buy ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[12px] text-muted mt-8">
          Payments processed by Stripe. Secure checkout.
        </p>
      </main>
    </div>
  );
}
