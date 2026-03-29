"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Upload, CheckCircle, RefreshCw } from "lucide-react";
import type { UserProfile } from "@/types";

interface CVUploadModalProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = "upload" | "parsing" | "review" | "error";

export function CVUploadModal({ onComplete }: CVUploadModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function extractPdfText(file: File): Promise<string> {
    // Parse PDF in the browser so Node.js DOMMatrix issues don't apply
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    // Use bundled worker via CDN to avoid Next.js bundler issues
    GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(await import("pdfjs-dist")).version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n");
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }

    setStep("parsing");
    setError(null);

    try {
      // Step 1: extract text in the browser (avoids Node.js DOMMatrix error)
      const cv_text = await extractPdfText(file);
      if (!cv_text || cv_text.trim().length < 50) {
        throw new Error("Could not read text from this PDF. Try a text-based PDF rather than a scanned image.");
      }

      // Step 2: send raw text to server for Groq parsing
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setProfile(data.profile);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const parsed = profile?.parsed_profile;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-6">
      <div className="bg-parchment w-full max-w-md border border-warm-border shadow-panel">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-warm-border">
          <h2 className="font-display text-h1 text-ink">Upload your CV</h2>
          <p className="text-body text-muted mt-2">
            Your CV is parsed once and stored in your profile. All emails are generated from it.
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Upload step */}
          {(step === "upload" || step === "error") && (
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
                onChange={onFileChange}
              />
              {error && (
                <p className="mt-4 text-small text-rust">{error}</p>
              )}
            </>
          )}

          {/* Parsing step */}
          {step === "parsing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Reading your CV…</p>
              <p className="text-small text-muted/60">Claude is extracting your profile</p>
            </div>
          )}

          {/* Review step */}
          {step === "review" && parsed && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-success-green">
                <CheckCircle size={16} />
                <span className="text-small font-medium uppercase tracking-widest">CV parsed</span>
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
                  onClick={() => { setStep("upload"); setProfile(null); }}
                  className="px-4 border border-warm-border text-muted hover:border-ink hover:text-ink transition-colors"
                  title="Re-upload"
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
