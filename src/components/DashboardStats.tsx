"use client";

import type { DashboardStats } from "@/types";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsRow({ stats }: DashboardStatsProps) {
  const tiles = [
    { label: "In List", value: stats.total, color: "text-ink" },
    { label: "Sent", value: stats.sent, color: "text-muted" },
    { label: "Replied", value: stats.replied, color: "text-success-green" },
    { label: "Follow-ups Due", value: stats.followup_due, color: "text-rust" },
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
        </div>
      ))}
    </div>
  );
}
