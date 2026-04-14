"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

export function RolePicker() {
  const router = useRouter();
  const [loading, setLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(role: UserRole) {
    setLoading(role);
    setError(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(null);
        return;
      }
      if (role === "employer") {
        router.push("/employer/setup");
      } else {
        router.push("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  const isLoading = loading !== null;

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-5 sm:px-8">
      <div className="w-full max-w-[640px]">
        {/* Header */}
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4 text-center">
          Welcome
        </p>
        <h1 className="font-display text-[28px] sm:text-[42px] font-light text-ink leading-tight text-center">
          How will you use<br />Kitchen Applications?
        </h1>

        {/* Cards */}
        <div className="mt-12 flex flex-col sm:flex-row gap-0 border border-warm-border">
          {/* Chef card */}
          <button
            onClick={() => handleSelect("chef")}
            disabled={isLoading}
            className="flex-1 p-8 sm:p-10 text-left border-b sm:border-b-0 sm:border-r border-warm-border hover:bg-ink/5 transition-colors disabled:opacity-60 group"
          >
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4">
              For chefs
            </p>
            <p className="font-display text-[24px] sm:text-[28px] font-light text-ink leading-tight">
              I&apos;m a chef
            </p>
            <p className="text-[13px] text-muted mt-3 leading-relaxed">
              Browse 40+ Michelin-starred kitchens, generate AI-researched cover
              emails, and send directly from your Gmail account. Track replies
              and follow-ups from your dashboard.
            </p>
            {loading === "chef" ? (
              <div className="mt-8 flex items-center gap-2 text-[12px] text-muted">
                <Loader2 size={14} className="animate-spin" />
                Setting up…
              </div>
            ) : (
              <p className="mt-8 text-[12px] text-ink group-hover:underline underline-offset-4">
                Start browsing kitchens →
              </p>
            )}
          </button>

          {/* Employer card — coming soon */}
          <div
            className="flex-1 p-8 sm:p-10 text-left opacity-60 cursor-default"
          >
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[11px] tracking-[0.2em] uppercase text-muted">
                For restaurants
              </p>
              <span className="text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 border border-warm-border text-muted">
                Coming soon
              </span>
            </div>
            <p className="font-display text-[24px] sm:text-[28px] font-light text-ink leading-tight">
              I&apos;m hiring
            </p>
            <p className="text-[13px] text-muted mt-3 leading-relaxed">
              Claim your restaurant page and receive personalised applications
              from chefs worldwide. Review applicants, track interest, and
              schedule interviews — all in one inbox.
            </p>
            <p className="mt-8 text-[12px] text-muted">
              We&apos;ll notify you when this is ready.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
