"use client";

import Link from "next/link";
import type { DashboardStats } from "@/types";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsRow({ stats }: DashboardStatsProps) {
  const isChef = stats.user_type === "chef";
  const lowApps =
    isChef &&
    stats.applications_remaining !== null &&
    stats.applications_remaining < 5;

  const lastTile = isChef
    ? {
        label: "Applications",
        value:
          stats.applications_remaining === null
            ? "∞"
            : String(stats.applications_remaining),
        color: lowApps ? "text-rust" : "text-ink",
        extra: (
          <Link
            href="/upgrade"
            className="text-[11px] tracking-wide text-muted hover:text-ink transition-colors mt-1 block"
          >
            Upgrade plan →
          </Link>
        ),
      }
    : { label: "Draft Ready", value: String(stats.draft_ready), color: "text-muted", extra: null };

  const tiles = [
    { label: "Emails Sent", value: String(stats.sent), color: "text-ink", extra: null },
    { label: "Replied", value: String(stats.replied), color: "text-success-green", extra: null },
    { label: "Follow-ups Due", value: String(stats.followup_due), color: "text-rust", extra: null },
    lastTile,
  ];

  return (
    <div className="grid grid-cols-4 gap-0 border border-warm-border">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`px-8 py-6 ${i < tiles.length - 1 ? "border-r border-warm-border" : ""}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <p className="text-label text-muted">{tile.label}</p>
          <p className={`font-display text-[48px] font-light mt-1 ${tile.color}`}>
            {tile.value}
          </p>
          {tile.extra}
        </div>
      ))}
    </div>
  );
}
