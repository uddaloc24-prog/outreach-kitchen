"use client";

import Link from "next/link";
import type { DashboardStats } from "@/types";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsRow({ stats }: DashboardStatsProps) {
  const sub = stats.subscription;
  const hasDodoSub = sub && sub.status === "active";
  const showQuota = hasDodoSub || stats.user_type === "chef" || stats.user_type === "free_trial";
  const isFreeTrialUser = stats.user_type === "free_trial" && !hasDodoSub;

  // Determine remaining applications
  const remaining = hasDodoSub
    ? sub.applications_limit - sub.applications_used
    : stats.applications_remaining;

  const lowApps = showQuota && remaining !== null && remaining < 2;

  const lastTile = showQuota
    ? {
        label: hasDodoSub
          ? `${sub.tier.charAt(0).toUpperCase()}${sub.tier.slice(1)} Plan`
          : isFreeTrialUser
          ? "Free Emails"
          : "Applications",
        value: remaining === null ? "\u221E" : String(remaining),
        subtitle: hasDodoSub
          ? `${sub.applications_used} / ${sub.applications_limit} used`
          : null,
        color: lowApps ? "text-rust" : "text-ink",
        extra: hasDodoSub ? (
          <Link
            href="/upgrade"
            className="text-[11px] tracking-wide text-muted hover:text-ink transition-colors mt-1 block"
          >
            Manage subscription \u2192
          </Link>
        ) : (
          <Link
            href={isFreeTrialUser ? "/pricing" : "/upgrade"}
            className="text-[11px] tracking-wide text-muted hover:text-ink transition-colors mt-1 block"
          >
            {isFreeTrialUser ? "Get full access \u2192" : "Upgrade plan \u2192"}
          </Link>
        ),
      }
    : {
        label: "Draft Ready",
        value: String(stats.draft_ready),
        subtitle: null,
        color: "text-muted",
        extra: null,
      };

  const tiles = [
    { label: "Emails Sent", value: String(stats.sent), subtitle: null, color: "text-ink", extra: null },
    { label: "Replied", value: String(stats.replied), subtitle: null, color: "text-success-green", extra: null },
    { label: "Follow-ups Due", value: String(stats.followup_due), subtitle: null, color: "text-rust", extra: null },
    lastTile,
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-warm-border">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`px-6 sm:px-8 py-5 sm:py-6 ${
            i < tiles.length - 1
              ? "border-b sm:border-b-0 sm:border-r border-warm-border"
              : ""
          }`}
        >
          <p className="text-[11px] tracking-widest uppercase text-muted">{tile.label}</p>
          <p className={`font-display text-[36px] sm:text-[48px] font-light mt-1 leading-none ${tile.color}`}>
            {tile.value}
          </p>
          {tile.subtitle && (
            <p className="text-[11px] text-muted mt-1">{tile.subtitle}</p>
          )}
          {tile.extra}
        </div>
      ))}
    </div>
  );
}
