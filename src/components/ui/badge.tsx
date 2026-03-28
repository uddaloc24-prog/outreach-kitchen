import * as React from "react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  not_contacted: "text-muted border-warm-border bg-transparent",
  researching: "text-gold border-gold bg-transparent animate-status-pulse",
  draft_ready: "text-ink border-ink bg-transparent",
  sent: "text-muted/70 border-warm-border/50 bg-transparent",
  replied: "text-success-green border-success-green bg-transparent",
  followup_due: "text-rust border-rust bg-transparent",
  skipped: "text-muted/30 border-warm-border/30 bg-transparent",
};

const statusLabels: Record<string, string> = {
  not_contacted: "Not contacted",
  researching: "Researching…",
  draft_ready: "Draft ready",
  sent: "Sent",
  replied: "Replied",
  followup_due: "Follow-up due",
  skipped: "Skipped",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full border text-small font-body",
        statusStyles[status] ?? "text-muted border-warm-border",
        className
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

// Generic badge
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "gold" | "rust" | "green" | "muted" | "ink";
}

export function Badge({ variant = "muted", className, children, ...props }: BadgeProps) {
  const variantStyles = {
    gold: "text-gold border-gold",
    rust: "text-rust border-rust",
    green: "text-success-green border-success-green",
    muted: "text-muted border-warm-border",
    ink: "text-ink border-ink",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-small font-body",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
