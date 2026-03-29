"use client";

import { useState } from "react";
import { Loader2, CheckCircle, RefreshCw } from "lucide-react";
import type { UserProfile } from "@/types";

interface CVUploadModalProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = "paste" | "parsing" | "review" | "error";

export function CVUploadModal({ onComplete }: CVUploadModalProps) {
  const [step, setStep] = useState<Step>("paste");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cvText, setCvText] = useState("");

  async function handleSubmit() {
    if (cvText.trim().length < 50) {
      setError("Please paste your full CV — it looks too short.");
      return;
    }

    setStep("parsing");
    setError(null);

    try {
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setProfile(data.profile);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("paste");
    }
  }

  const parsed = profile?.parsed_profile;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-6">
      <div className="bg-parchment w-full max-w-lg border border-warm-border shadow-panel">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-warm-border">
          <h2 className="font-display text-h1 text-ink">Set up your profile</h2>
          <p className="text-body text-muted mt-2">
            Paste your CV below. All emails are generated from it.
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Paste step */}
          {(step === "paste" || step === "error") && (
            <div className="space-y-4">
              <div>
                <p className="text-label text-muted mb-2">
                  Copy your CV from Word, Google Docs, or LinkedIn and paste it here
                </p>
                <textarea
                  className="w-full h-48 border border-warm-border bg-surface text-body text-ink px-4 py-3 resize-none focus:outline-none focus:border-ink transition-colors placeholder:text-muted/50"
                  placeholder="Paste your CV text here…"
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-small text-rust">{error}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={cvText.trim().length < 50}
                className="w-full bg-ink text-parchment py-3 text-small uppercase tracking-widest hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Parse my CV
              </button>
            </div>
          )}

          {/* Parsing step */}
          {step === "parsing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Reading your CV…</p>
              <p className="text-small text-muted/60">Extracting your profile</p>
            </div>
          )}

          {/* Review step */}
          {step === "review" && parsed && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-success-green">
                <CheckCircle size={16} />
                <span className="text-small font-medium uppercase tracking-widest">Profile ready</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-label text-muted mb-1">Name</p>
                  <p className="text-body text-ink">{parsed.name || "—"}</p>
                </div>
                <div>
                  <p className="text-label text-muted mb-1">Current Role</p>
                  <p className="text-body text-ink">{parsed.current_role || "—"}</p>
                </div>
                <div>
                  <p className="text-label text-muted mb-1">Summary</p>
                  <p className="text-body text-muted leading-relaxed">{parsed.summary || "—"}</p>
                </div>
                {parsed.experiences?.length > 0 && (
                  <div>
                    <p className="text-label text-muted mb-1">Experience</p>
                    <div className="space-y-1">
                      {parsed.experiences.slice(0, 3).map((exp, i) => (
                        <p key={i} className="text-small text-ink">
                          {exp.role} · {exp.place} ({exp.period})
                        </p>
                      ))}
                      {parsed.experiences.length > 3 && (
                        <p className="text-small text-muted">+{parsed.experiences.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => profile && onComplete(profile)}
                  className="flex-1 bg-ink text-parchment py-3 text-small uppercase tracking-widest hover:bg-ink/80 transition-colors"
                >
                  Looks good — Start Applying
                </button>
                <button
                  onClick={() => { setStep("paste"); setProfile(null); setCvText(""); }}
                  className="px-4 border border-warm-border text-muted hover:border-ink hover:text-ink transition-colors"
                  title="Re-enter CV"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
