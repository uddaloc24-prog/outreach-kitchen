"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";

const PLAN_ORDER = ["starter", "pro", "unlimited"] as const;
type Plan = (typeof PLAN_ORDER)[number];

const PLAN_DETAILS: Record<Plan, { name: string; price: string; apps: string }> = {
  starter:   { name: "Starter",   price: "$29", apps: "30 applications" },
  pro:       { name: "Pro",       price: "$49", apps: "50 applications" },
  unlimited: { name: "Unlimited", price: "$79", apps: "Unlimited applications" },
};

interface UpgradeClientProps {
  currentPlan: string | null;
  applicationsRemaining: number | null;
}

export function UpgradeClient({ currentPlan, applicationsRemaining }: UpgradeClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentIndex = currentPlan ? PLAN_ORDER.indexOf(currentPlan as Plan) : -1;
  const upgradePlans = PLAN_ORDER.filter((_, i) => i > currentIndex);

  async function handleUpgrade(planKey: string) {
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

      <main className="max-w-[800px] mx-auto px-8 py-20">
        <div className="mb-12">
          <h1 className="font-display text-[48px] font-light text-ink">Upgrade your plan</h1>
          <p className="text-body text-muted mt-3">
            {currentPlan
              ? `You&apos;re on the ${PLAN_DETAILS[currentPlan as Plan]?.name ?? currentPlan} plan`
              : "You don&apos;t have an active plan"}
            {applicationsRemaining !== null
              ? ` with ${applicationsRemaining} application${applicationsRemaining === 1 ? "" : "s"} remaining.`
              : " with unlimited applications."}
          </p>
        </div>

        {upgradePlans.length === 0 ? (
          <div className="border border-warm-border p-10 text-center">
            <p className="font-display text-[24px] font-light text-ink">
              You&apos;re on the Unlimited plan
            </p>
            <p className="text-body text-muted mt-2">No further upgrades available.</p>
            <Link
              href="/"
              className="mt-6 inline-block text-[13px] tracking-wide border border-ink px-6 py-3 text-ink hover:bg-ink hover:text-parchment transition-colors"
            >
              Back to Restaurant List
            </Link>
          </div>
        ) : (
          <div className={`grid gap-0 border border-warm-border ${upgradePlans.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {upgradePlans.map((plan, i) => {
              const details = PLAN_DETAILS[plan];
              return (
                <div
                  key={plan}
                  className={`p-10 flex flex-col ${i < upgradePlans.length - 1 ? "border-r border-warm-border" : ""}`}
                >
                  <p className="text-[13px] tracking-widest uppercase text-muted">{details.name}</p>
                  <p className="font-display text-[56px] font-light mt-2 leading-none text-ink">
                    {details.price}
                  </p>
                  <p className="text-[13px] mt-1 text-muted">{details.apps}</p>

                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loading !== null}
                    className="mt-10 w-full py-3 text-[13px] tracking-wide border border-ink text-ink hover:bg-ink hover:text-parchment transition-colors disabled:opacity-50"
                  >
                    {loading === plan ? "Redirecting…" : `Upgrade to ${details.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
