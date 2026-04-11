"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Globe, Brain, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmailDraft } from "@/components/EmailDraft";
import { starsDisplay } from "@/lib/utils";
import type { RestaurantWithOutreach, ResearchBrief, GeneratedEmail } from "@/types";

interface ResearchPanelProps {
  restaurant: RestaurantWithOutreach | null;
  onClose: () => void;
  onStatusChange: () => void;
}

type Step = "idle" | "scraping" | "briefing" | "done" | "error";
type StepError = string | null;

export function ResearchPanel({ restaurant, onClose, onStatusChange }: ResearchPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [stepError, setStepError] = useState<StepError>(null);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [outreachLogId, setOutreachLogId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [careersEmail, setCareersEmail] = useState<string | null>(null);
  const [isFindingEmail, setIsFindingEmail] = useState(false);
  const [emailOptions, setEmailOptions] = useState<string[]>([]);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when restaurant changes
  useEffect(() => {
    if (!restaurant) return;
    setBrief(null);
    setEmail(null);
    setStep("idle");
    setElapsed(0);
    setCareersEmail(restaurant.careers_email ?? null);
    setEmailOptions([]);
    setIsEditingEmail(false);
    setEmailInput(restaurant.careers_email ?? "");
    setEmailVerified(null);
    setOutreachLogId(restaurant.outreach_log?.id ?? null);

    if (restaurant.outreach_log?.research_brief) {
      setBrief(restaurant.outreach_log.research_brief);
      setStep("done");
    }
    if (restaurant.outreach_log?.email_subject && restaurant.outreach_log?.email_body) {
      setEmail({
        subject: restaurant.outreach_log.email_subject,
        body: restaurant.outreach_log.email_body,
        word_count: restaurant.outreach_log.email_body.split(/\s+/).length,
      });
    }
  }, [restaurant?.id]);

  // Elapsed timer — runs while scraping or briefing
  useEffect(() => {
    if (step === "scraping" || step === "briefing") {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [step]);

  // Auto-advance scraping → briefing after 10s (API is one long call)
  useEffect(() => {
    if (step === "scraping") {
      autoAdvanceRef.current = setTimeout(() => setStep("briefing"), 10000);
    }
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, [step]);

  if (!restaurant) return null;

  const status = restaurant.outreach_log?.status ?? "not_contacted";

  async function startResearch() {
    if (!restaurant) return;
    setStepError(null);
    setElapsed(0);
    try {
      setStep("scraping");
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          router.push("/pricing?reason=limit");
          return;
        }
        const err = await res.json();
        throw new Error(err.error || "Research failed");
      }

      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      setStep("briefing");
      const data = await res.json();
      setBrief(data.brief);
      if (data.outreach_log_id) setOutreachLogId(data.outreach_log_id);
      if (typeof data.email_verified === "boolean") setEmailVerified(data.email_verified);
      if (data.careers_email) setCareersEmail(data.careers_email);
      setStep("done");
      onStatusChange();
    } catch (err) {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      const msg = err instanceof Error ? err.message : "Research failed";
      setStep("error");
      setStepError(msg);
      toast.error(msg);
    }
  }

  async function findEmail() {
    if (!restaurant) return;
    setIsFindingEmail(true);
    try {
      const res = await fetch("/api/restaurants/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id }),
      });
      const data = await res.json() as { found: boolean; email: string | null; emails: string[] };
      if (data.found && data.email) {
        setCareersEmail(data.email);
        setEmailInput(data.email);
        setEmailOptions(data.emails ?? []);
        setEmailVerified(true);
        setIsEditingEmail(false);
        toast.success(`Found: ${data.email}`);
        onStatusChange();
      } else {
        setEmailOptions([]);
        setCareersEmail(null);
        setIsEditingEmail(false);
        toast.error("Email ID not found");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setIsFindingEmail(false);
    }
  }

  async function saveManualEmail(override?: string) {
    if (!restaurant) return;
    const clean = (override ?? emailInput).trim().toLowerCase();
    if (!clean.includes("@")) return;
    try {
      const res = await fetch("/api/restaurants/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id, manual_email: clean }),
      });
      if (res.ok) {
        setCareersEmail(clean);
        setEmailVerified(true);
        setIsEditingEmail(false);
        setEmailOptions([clean]);
        toast.success("Email saved");
        onStatusChange();
      }
    } catch {
      toast.error("Failed to save email");
    }
  }

  async function generateEmail() {
    if (!restaurant) return;
    setEmailError(null);
    try {
      setIsGeneratingEmail(true);
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          router.push("/pricing?reason=limit");
          return;
        }
        const err = await res.json();
        throw new Error(err.error || "Email generation failed");
      }

      const data = await res.json();
      setEmail(data);
      onStatusChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email generation failed";
      setEmailError(msg);
      toast.error(msg);
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[720px] bg-surface border-l border-warm-border shadow-panel overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-warm-border px-8 py-5 flex items-start justify-between z-10">
          <div>
            <h2 className="font-display text-[32px] font-semibold text-ink leading-tight">
              {restaurant.name}
            </h2>
            <p className="text-[14px] font-medium text-ink/70 mt-1">
              {restaurant.city} ·{" "}
              <span className="text-gold font-bold">{starsDisplay(restaurant.stars)}</span>
              {restaurant.head_chef && ` · ${restaurant.head_chef}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors mt-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Already sent banner */}
          {(status === "sent" || status === "replied" || status === "followup_due") && (
            <div className="flex items-center gap-3 bg-success-green/10 border border-success-green/30 px-4 py-3">
              <CheckCircle size={16} className="text-success-green flex-shrink-0" />
              <div>
                <p className="text-body font-semibold text-success-green">
                  Application sent
                  {restaurant.outreach_log?.sent_at
                    ? ` · ${new Date(restaurant.outreach_log.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : ""}
                </p>
                <p className="text-small text-muted">You can send again if the email bounced or you want to update your application.</p>
              </div>
            </div>
          )}

          {/* Progress / Start research */}
          {status === "not_contacted" && step === "idle" && (
            <div className="flex flex-col items-start gap-4">
              <p className="text-body text-muted">
                Scrapes {restaurant.name}&apos;s website and generates a personalised brief.
              </p>
              <Button variant="rust" onClick={startResearch}>
                Start Deep Research →
              </Button>
            </div>
          )}

          {(step === "scraping" || step === "briefing") && (
            <ResearchLoader step={step} elapsed={elapsed} restaurantName={restaurant.name} />
          )}

          {step === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-body text-rust font-medium">Research failed</p>
              {stepError && (
                <p className="text-small text-muted bg-parchment border border-warm-border px-3 py-2">
                  {stepError}
                </p>
              )}
              <div>
                <Button variant="rust-outline" size="sm" onClick={startResearch}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Research brief */}
          {brief && (
            <div className="space-y-4 animate-fade-up">
              <p className="text-label text-ink font-bold tracking-widest">Research Brief</p>
              <div className="grid grid-cols-1 gap-4">
                <BriefCard
                  title="Kitchen Identity"
                  content={brief.kitchen_identity}
                  variant="normal"
                />
                <BriefCard
                  title="What They Hire For"
                  content={brief.what_they_hire_for}
                  variant="normal"
                />
                <BriefCard
                  title="Your Connection"
                  content={brief.your_connection}
                  variant="highlight"
                />
              </div>

              {/* Email address section — always visible */}
              <div className="border border-warm-border px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-label text-muted tracking-widest">APPLICATION EMAIL</p>
                  <button
                    onClick={() => {
                      setIsEditingEmail(!isEditingEmail);
                      setEmailInput(careersEmail ?? "");
                    }}
                    className="flex items-center gap-1 text-small text-muted hover:text-ink transition-colors"
                  >
                    <Pencil size={10} />
                    {isEditingEmail ? "Cancel" : "Edit"}
                  </button>
                </div>

                {isEditingEmail ? (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter email address…"
                      className="flex-1 text-small border border-warm-border px-2 py-1 bg-parchment text-ink focus:outline-none focus:border-gold"
                    />
                    <Button
                      variant="rust"
                      size="sm"
                      onClick={() => saveManualEmail()}
                      disabled={!emailInput.includes("@")}
                    >
                      Save
                    </Button>
                  </div>
                ) : careersEmail ? (
                  <p className="text-small font-mono text-ink">{careersEmail}</p>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 px-3 py-3 space-y-2">
                    <p className="text-small font-bold text-amber-800">
                      Email ID not found
                    </p>
                    <p className="text-small text-amber-700">
                      No application email could be found for this restaurant. They may use a contact form instead.
                    </p>
                    {restaurant.website_url && (
                      <a
                        href={restaurant.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="rust-outline" size="sm" className="mt-1 w-full">
                          Apply at {restaurant.name}&apos;s website →
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                {/* Multiple email options */}
                {emailOptions.length > 1 && !isEditingEmail && (
                  <div className="pt-1 space-y-1">
                    <p className="text-small text-muted">Other addresses found:</p>
                    {emailOptions.slice(1).map((e) => (
                      <button
                        key={e}
                        onClick={() => saveManualEmail(e)}
                        className="block text-small text-muted hover:text-ink underline"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  variant="rust-outline"
                  size="sm"
                  onClick={findEmail}
                  disabled={isFindingEmail}
                >
                  {isFindingEmail ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-2" />
                      Searching…
                    </>
                  ) : (
                    "Search internet for email →"
                  )}
                </Button>
              </div>

              {!email && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="gold"
                    onClick={generateEmail}
                    disabled={isGeneratingEmail}
                  >
                    {isGeneratingEmail ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-2" />
                        Writing email…
                      </>
                    ) : (
                      "Generate Email →"
                    )}
                  </Button>
                  {emailError && (
                    <p className="text-small text-rust font-medium bg-rust/5 border border-rust/20 px-3 py-2">
                      {emailError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Email draft — always shown when email exists, even if already sent */}
          {email && (
            <EmailDraft
              restaurant={{ ...restaurant, careers_email: careersEmail ?? restaurant.careers_email }}
              email={email}
              outreachLogId={outreachLogId}
              alreadySent={status === "sent" || status === "replied" || status === "followup_due"}
              onEmailChange={setEmail}
              onSent={() => {
                onStatusChange();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ResearchLoader({
  step,
  elapsed,
  restaurantName,
}: {
  step: Step;
  elapsed: number;
  restaurantName: string;
}) {
  const isScraping = step === "scraping";

  const stages = [
    {
      key: "scraping",
      icon: Globe,
      label: "Scraping website",
      sublabel: `Reading ${restaurantName}'s menus, philosophy & team pages`,
    },
    {
      key: "briefing",
      icon: Brain,
      label: "Generating brief",
      sublabel: "AI is matching your profile against the kitchen's culture",
    },
    {
      key: "done",
      icon: CheckCircle,
      label: "Brief ready",
      sublabel: "",
    },
  ];

  const activeIndex = isScraping ? 0 : 1;

  return (
    <div className="flex flex-col gap-8 py-6">
      {/* Elapsed timer */}
      <div className="flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-gold" />
        <span className="text-label text-muted tracking-widest">
          {isScraping ? "SCRAPING" : "GENERATING"} — {elapsed}s
        </span>
      </div>

      {/* Stage list */}
      <div className="flex flex-col gap-4">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={s.key} className="flex items-start gap-4">
              {/* Icon circle */}
              <div
                className={`mt-0.5 w-8 h-8 flex items-center justify-center border transition-colors ${
                  isDone
                    ? "border-success-green bg-success-green/10"
                    : isActive
                    ? "border-gold bg-gold/10"
                    : "border-warm-border"
                }`}
              >
                <Icon
                  size={14}
                  className={
                    isDone ? "text-success-green" : isActive ? "text-gold" : "text-warm-border"
                  }
                />
              </div>

              {/* Text */}
              <div className="flex-1 pt-1">
                <p
                  className={`text-body font-medium ${
                    isDone ? "text-success-green" : isActive ? "text-ink" : "text-muted/40"
                  }`}
                >
                  {s.label}
                  {isDone && " ✓"}
                  {isActive && (
                    <span className="ml-2 text-gold animate-status-pulse">•••</span>
                  )}
                </p>
                {isActive && s.sublabel && (
                  <p className="text-small text-muted mt-0.5">{s.sublabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className="text-small text-muted border-t border-warm-border pt-4">
        This usually takes 15–30 seconds depending on the restaurant&apos;s website.
      </p>
    </div>
  );
}

function BriefCard({
  title,
  content,
  variant,
}: {
  title: string;
  content: string;
  variant: "normal" | "highlight";
}) {
  return (
    <Card
      className={variant === "highlight" ? "border-gold bg-gold/[0.04]" : ""}
    >
      <CardHeader>
        <CardTitle className="text-[11px] tracking-[2.5px] font-bold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[15px] font-medium text-ink leading-relaxed">
          {content || <span className="text-muted italic">Not generated yet</span>}
        </p>
      </CardContent>
    </Card>
  );
}
