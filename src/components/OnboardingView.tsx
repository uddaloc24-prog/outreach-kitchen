"use client";

import { TopBar } from "./TopBar";

interface OnboardingViewProps {
  onComplete: () => void;
}

const STEPS = [
  {
    number: "01",
    title: "Browse kitchens",
    description:
      "40+ Michelin-starred restaurants across Europe, Asia, the Americas, and beyond. Filter by region, star rating, or chef name.",
  },
  {
    number: "02",
    title: "AI research brief",
    description:
      "Click any restaurant and the system scrapes their website and generates a 3-part brief: kitchen identity, who they hire, and why you're a fit.",
  },
  {
    number: "03",
    title: "Personalised cover email",
    description:
      "A 150–180 word application written in your voice, referencing the kitchen's actual ethos and team. Edit freely before sending.",
  },
  {
    number: "04",
    title: "Send from your own Gmail",
    description:
      "The email goes out from your Google account directly to the kitchen's careers inbox. Replies land in your inbox like any normal email.",
  },
  {
    number: "05",
    title: "Track replies & follow up",
    description:
      "The dashboard shows every application, its status, and surfaces a follow-up prompt at 21 days if you haven't heard back.",
  },
];

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-10 sm:py-20">
        {/* Header */}
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4">
          Welcome
        </p>
        <h1 className="font-display text-[28px] sm:text-[48px] font-light text-ink leading-[1.1]">
          Your personal kitchen<br className="hidden sm:block" /> application machine.
        </h1>
        <p className="text-[13px] sm:text-body text-muted mt-5 max-w-[500px] leading-relaxed">
          From browsing to sending in under 5 minutes. Every application is
          researched and written by AI — then reviewed and sent by you.
        </p>

        {/* Steps */}
        <div className="mt-16 border-t border-warm-border">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="border-b border-warm-border py-7 flex gap-10"
            >
              <span className="text-[11px] tracking-[0.15em] text-muted/60 pt-0.5 w-6 shrink-0 select-none">
                {step.number}
              </span>
              <div>
                <p className="text-[14px] tracking-wide text-ink">
                  {step.title}
                </p>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-start gap-3">
          <button
            onClick={onComplete}
            className="border border-ink px-10 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Start applying →
          </button>
          <p className="text-[12px] text-muted">
            You have 1 free application included — no payment needed to begin.
          </p>
        </div>
      </div>
    </div>
  );
}
