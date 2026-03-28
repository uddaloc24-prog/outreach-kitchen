"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { daysSince, starsDisplay } from "@/lib/utils";
import type { RestaurantWithOutreach } from "@/types";

interface FollowUpQueueProps {
  restaurants: RestaurantWithOutreach[];
  onUpdate: () => void;
}

export function FollowUpQueue({ restaurants, onUpdate }: FollowUpQueueProps) {
  if (restaurants.length === 0) {
    return (
      <div className="border border-warm-border px-8 py-8 text-center">
        <p className="font-display text-h2 italic text-muted">No follow-ups due</p>
        <p className="text-small text-muted/60 mt-1">Check back in 21 days after sending</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {restaurants.map((r) => (
        <FollowUpRow key={r.id} restaurant={r} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function FollowUpRow({
  restaurant,
  onUpdate,
}: {
  restaurant: RestaurantWithOutreach;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const sentAt = restaurant.outreach_log?.sent_at;
  const days = sentAt ? daysSince(sentAt) : 0;

  async function loadPreview() {
    if (preview) {
      setExpanded(!expanded);
      return;
    }
    setExpanded(true);
    setIsLoadingPreview(true);
    try {
      const res = await fetch("/api/email/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_log_id: restaurant.outreach_log?.id }),
      });
      const data = await res.json();
      setPreview(data.body);
    } catch {
      toast.error("Failed to generate follow-up preview");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function sendFollowUp() {
    if (!restaurant.outreach_log?.id) return;
    try {
      setIsSending(true);
      const res = await fetch("/api/email/send-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_log_id: restaurant.outreach_log.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Send failed");
      }
      toast.success(`Follow-up sent to ${restaurant.name} ✓`);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send follow-up");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="border border-warm-border bg-surface">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-gold text-[13px]">{starsDisplay(restaurant.stars)}</span>
          <div>
            <span className="font-display text-[17px] text-ink">{restaurant.name}</span>
            <span className="text-small text-muted ml-3">{restaurant.city}</span>
          </div>
          <Badge variant="rust">{days} days since sent</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadPreview}
          >
            Preview {expanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
          </Button>
          <Button
            variant="rust"
            size="sm"
            onClick={sendFollowUp}
            disabled={isSending}
          >
            {isSending ? <Loader2 size={12} className="animate-spin" /> : "Send Follow-Up"}
          </Button>
          <Button variant="dim" size="sm" onClick={onUpdate}>
            Dismiss
          </Button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div className="border-t border-warm-border px-6 py-4 bg-parchment/30">
          {isLoadingPreview ? (
            <div className="flex items-center gap-2 text-muted text-small">
              <Loader2 size={12} className="animate-spin" />
              Generating follow-up…
            </div>
          ) : preview ? (
            <pre className="text-body text-ink whitespace-pre-wrap font-body leading-relaxed">
              {preview}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}
