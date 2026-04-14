"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Upload, CheckCircle, RefreshCw } from "lucide-react";
import type { UserProfile } from "@/types";

interface CVUploadModalProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = "input" | "parsing" | "review" | "error";
type InputMode = "upload" | "paste";

export function CVUploadModal({ onComplete }: CVUploadModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<InputMode>("upload");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cvText, setCvText] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (res.status === 413) throw new Error("File is too large. Please use a smaller PDF (under 4 MB).");
      if (res.status >= 500) throw new Error("Server error — please try again in a moment.");
      throw new Error(text.slice(0, 120) || "Upload failed");
    }
  }

  async function submitText(text: string) {
    if (!text || text.trim().length < 50) {
      setError("CV looks too short — paste the full text.");
      return;
    }
    setStep("parsing");
    setError(null);
    try {
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: text }),
      });
      const data = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setProfile(data.profile);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("input");
    }
  }

  // Send raw PDF to server as FormData — server-side parsing works on all devices
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("File is too large. Please use a PDF under 4 MB.");
      return;
    }
    setStep("parsing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });
      const data = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setProfile(data.profile);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("input");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const parsed = profile?.parsed_profile;

  function reset() {
    setStep("input");
    setProfile(null);
    setCvText("");
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center sm:p-6">
      <div className="bg-parchment w-full sm:max-w-lg border border-warm-border shadow-panel max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-none">
        {/* Header */}
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-warm-border">
          <h2 className="font-display text-[22px] sm:text-h1 text-ink">Set up your profile</h2>
          <p className="text-[13px] sm:text-body text-muted mt-2">
            Your CV is parsed once and stored. All emails are generated from it.
          </p>
        </div>

        <div className="px-5 sm:px-8 py-5 sm:py-6">
          {(step === "input" || step === "error") && (
            <div className="space-y-4">
              {/* Mode tabs */}
              <div className="flex border border-warm-border">
                <button
                  onClick={() => { setMode("upload"); setError(null); }}
                  className={`flex-1 py-3 text-small uppercase tracking-widest transition-colors ${
                    mode === "upload"
                      ? "bg-ink text-parchment"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Upload PDF
                </button>
                <button
                  onClick={() => { setMode("paste"); setError(null); }}
                  className={`flex-1 py-3 text-small uppercase tracking-widest transition-colors ${
                    mode === "paste"
                      ? "bg-ink text-parchment"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {/* Upload mode */}
              {mode === "upload" && (
                <>
                  <div
                    className={`border-2 border-dashed transition-colors cursor-pointer py-12 flex flex-col items-center gap-3 ${
                      dragging ? "border-ink bg-ink/5" : "border-warm-border hover:border-muted"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload size={24} className="text-muted" />
                    <span className="text-body text-muted">Drop your PDF here or click to browse</span>
                    <span className="text-small text-muted/60">PDF only</span>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </>
              )}

              {/* Paste mode */}
              {mode === "paste" && (
                <>
                  <p className="text-label text-muted">
                    Copy from Word, Google Docs, or LinkedIn and paste below
                  </p>
                  <textarea
                    className="w-full h-48 border border-warm-border bg-surface text-body text-ink px-4 py-3 resize-none focus:outline-none focus:border-ink transition-colors placeholder:text-muted/50"
                    placeholder="Paste your CV text here…"
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => submitText(cvText)}
                    disabled={cvText.trim().length < 50}
                    className="w-full bg-ink text-parchment py-3 text-small uppercase tracking-widest hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Parse my CV
                  </button>
                </>
              )}

              {error && <p className="text-small text-rust">{error}</p>}
            </div>
          )}

          {/* Parsing */}
          {step === "parsing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Reading your CV…</p>
            </div>
          )}

          {/* Review */}
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
                  onClick={reset}
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
