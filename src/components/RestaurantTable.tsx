"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { starsDisplay } from "@/lib/utils";
import type { RestaurantWithOutreach } from "@/types";

interface RestaurantTableProps {
  restaurants: RestaurantWithOutreach[];
  onSelect: (restaurant: RestaurantWithOutreach) => void;
}

export function RestaurantTable({ restaurants, onSelect }: RestaurantTableProps) {
  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-h2 text-muted italic">No restaurants found</p>
        <p className="text-small text-muted mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sticky header */}
      <table className="w-full border-collapse">
        <thead className="sticky top-16 z-10 bg-parchment">
          <tr className="border-b border-warm-border">
            <th className="text-left px-8 py-3 text-label text-muted w-[80px]">Stars</th>
            <th className="text-left px-4 py-3 text-label text-muted">Restaurant</th>
            <th className="text-left px-4 py-3 text-label text-muted w-[160px]">City</th>
            <th className="text-left px-4 py-3 text-label text-muted w-[200px]">Head Chef</th>
            <th className="text-left px-4 py-3 text-label text-muted w-[160px]">Status</th>
            <th className="text-right px-8 py-3 text-label text-muted w-[160px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((restaurant, i) => {
            const status = restaurant.outreach_log?.status ?? "not_contacted";
            const delay = Math.min(i * 0.03, 0.5);
            return (
              <tr
                key={restaurant.id}
                onClick={() => onSelect(restaurant)}
                className="border-b border-warm-border/50 hover:bg-surface transition-colors cursor-pointer group"
                style={{ animationDelay: `${delay}s` }}
              >
                {/* Stars */}
                <td className="px-8 py-4">
                  <span className="text-gold text-[13px] tracking-wider">
                    {starsDisplay(restaurant.stars)}
                  </span>
                </td>

                {/* Restaurant name */}
                <td className="px-4 py-4">
                  <span className="font-display text-[18px] font-semibold text-ink group-hover:text-rust transition-colors">
                    {restaurant.name}
                  </span>
                  {restaurant.cuisine_style && (
                    <p className="text-small text-muted mt-0.5">{restaurant.cuisine_style}</p>
                  )}
                </td>

                {/* City */}
                <td className="px-4 py-4">
                  <span className="text-body text-ink">{restaurant.city}</span>
                </td>

                {/* Head Chef */}
                <td className="px-4 py-4">
                  <span className="text-body font-medium text-ink">{restaurant.head_chef ?? "—"}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <StatusBadge status={status} />
                </td>

                {/* Action */}
                <td className="px-8 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionButton status={status} onClick={() => onSelect(restaurant)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  status,
  onClick,
}: {
  status: string;
  onClick: () => void;
}) {
  if (status === "not_contacted") {
    return (
      <Button variant="rust-outline" size="sm" onClick={onClick}>
        Research →
      </Button>
    );
  }
  if (status === "draft_ready") {
    return (
      <Button variant="gold" size="sm" onClick={onClick}>
        Review Email →
      </Button>
    );
  }
  if (status === "followup_due") {
    return (
      <Button variant="rust" size="sm" onClick={onClick}>
        Follow Up →
      </Button>
    );
  }
  if (status === "researching") {
    return (
      <span className="text-small text-gold animate-status-pulse">Researching…</span>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      View →
    </Button>
  );
}
