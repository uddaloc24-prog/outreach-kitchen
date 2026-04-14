"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { RestaurantWithOutreach, GeneratedEmail } from "@/types";
import { ShareButtons } from "@/components/ShareButtons";

interface EmailDraftProps {
  restaurant: RestaurantWithOutreach;
  email: GeneratedEmail;
  outreachLogId: string | null;
  alreadySent?: boolean;
  onEmailChange: (email: GeneratedEmail) => void;
  onSent: () => void;
}

export function EmailDraft({
  restaurant,
  email,
  outreachLogId,
  alreadySent = false,
  onEmailChange,
  onSent,
}: EmailDraftProps) {
  const [body, setBody] = useState(email.body);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  // Sync body when email changes from parent
  useEffect(() => {
    setBody(email.body);
  }, [email.body]);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const wordCountOk = wordCount >= 150 && wordCount <= 180;

  const handleBodyChange = useCallback(
    (newBody: string) => {
      setBody(newBody);
      onEmailChange({ ...email, body: newBody, word_count: newBody.trim().split(/\s+/).length });
    },
    [email, onEmailChange]
  );

  async function sendEmail() {
    const logId = outreachLogId ?? restaurant.outreach_log?.id;
    if (!logId) {
      setSendError("Cannot find outreach log — try closing and re-opening this restaurant.");
      return;
    }
    setSendError(null);
    try {
      setIsSending(true);
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_log_id: logId }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        if (res.status === 402) {
          router.push("/pricing?reason=limit");
          return;
        }
        throw new Error(err.error || "Send failed");
      }

      toast.success(`Sent to ${restaurant.name} ✓`);
      setShowConfirm(false);
      setJustSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      setSendError(msg);
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter to send
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isSending) setShowConfirm(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSending]);

  return (
    <div className="space-y-4 border-t border-warm-border pt-6 animate-fade-up-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-label text-muted">{alreadySent ? "Email Sent" : "Draft Email"}</p>
        <Badge variant={wordCountOk ? "green" : "rust"}>
          {wordCount} words
        </Badge>
      </div>

      {/* Already-sent notice */}
      {alreadySent && (
        <p className="text-small text-muted bg-surface border border-warm-border px-3 py-2">
          You already sent this application. You can edit and send again if needed.
        </p>
      )}

      {/* Email preview */}
      <div className="border border-warm-border bg-surface">
        {/* Meta row */}
        <div className="px-4 py-3 border-b border-warm-border space-y-1">
          <div className="flex gap-3">
            <span className="text-small text-muted w-16">To</span>
            <span className="text-small text-ink">{restaurant.careers_email ?? "—"}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-small text-muted w-16">Subject</span>
            <span className="text-small text-ink">{email.subject}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {isEditing ? (
            <Textarea
              value={body}
              onChange={(e) => handleBodyChange(e.target.value)}
              rows={14}
              className="text-body border-none p-0 focus-visible:ring-0 resize-none w-full"
              autoFocus
            />
          ) : (
            <pre className="text-body text-ink whitespace-pre-wrap font-body leading-relaxed">
              {body}
            </pre>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <Button
          variant="rust"
          size="full"
          onClick={() => setShowConfirm(true)}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" />
              Sending…
            </>
          ) : (
            <>
              <Send size={14} className="mr-2" />
              {alreadySent ? "Send Again" : "Send Now"}
            </>
          )}
        </Button>

        <Button
          variant="rust-outline"
          size="full"
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? "Save Changes" : "Edit & Send"}
        </Button>

        <Button variant="dim" size="full" onClick={onSent}>
          Skip this one →
        </Button>
      </div>

      {sendError && (
        <p className="text-small text-rust font-medium bg-rust/5 border border-rust/20 px-3 py-2">
          {sendError}
        </p>
      )}

      {/* Keyboard hint */}
      {!justSent && (
        <p className="text-small text-muted/50 text-center">⌘ + Enter to send</p>
      )}

      {/* Post-send share CTA */}
      {justSent && (
        <div className="border border-warm-border p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-ink">
            <Share2 size={16} />
            <p className="font-display text-[18px] font-light">
              Know a chef who&apos;s looking?
            </p>
          </div>
          <p className="text-[13px] text-muted">
            Share Kitchen Applications with a friend — when they send their first
            application, you both get 3 bonus applications.
          </p>
          <ShareButtons
            text="I just applied to a Michelin-starred restaurant with Kitchen Applications — it researches the restaurant and writes a personalised cover email for you. Check it out:"
            url={process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app"}
          />
          <button
            onClick={onSent}
            className="text-[12px] text-muted hover:text-ink transition-colors mt-2"
          >
            Continue &rarr;
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {alreadySent ? "Send again to" : "Send application to"} {restaurant.name}?
            </DialogTitle>
            <DialogDescription>
              This will send your email to {restaurant.careers_email ?? "the restaurant"} via Gmail.
              {alreadySent && " You have already sent once — this will be a second email."}
            </DialogDescription>
          </DialogHeader>
          {sendError && (
            <p className="text-small text-rust font-medium bg-rust/5 border border-rust/20 px-3 py-2 mt-2">
              {sendError}
            </p>
          )}
          <div className="flex gap-3 mt-2">
            <Button
              variant="rust"
              size="lg"
              className="flex-1"
              onClick={sendEmail}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                "Confirm Send"
              )}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowConfirm(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
