import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Wall of Placements — Chefs Hired Through Kitchen Applications",
  description:
    "Real chefs, real restaurants, real placements. See who landed their dream kitchen job through Kitchen Applications.",
  openGraph: {
    title: "Wall of Placements — Chefs Hired Through Kitchen Applications",
    description:
      "Real chefs, real restaurants, real placements.",
  },
};

interface Placement {
  id: string;
  chef_name: string;
  restaurant_name: string;
  restaurant_city: string;
  restaurant_stars: number;
  role_title: string;
  quote: string | null;
  chef_slug: string | null;
  placed_at: string;
}

export default async function PlacementsPage() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("placements")
    .select("*")
    .eq("is_public", true)
    .order("placed_at", { ascending: false });

  const placements: Placement[] = data ?? [];

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[820px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <h1 className="font-display text-[36px] sm:text-[56px] font-light text-ink leading-tight">
          Wall of Placements
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted mt-4 max-w-lg">
          Real chefs who landed positions at world-class restaurants through
          Kitchen Applications.
        </p>

        {placements.length === 0 ? (
          <div className="mt-16 border border-warm-border p-10 text-center">
            <p className="font-display text-[24px] font-light text-ink">
              First placements coming soon
            </p>
            <p className="text-[13px] text-muted mt-2">
              We&apos;re just getting started. Be among the first chefs to land
              a position and appear on this wall.
            </p>
            <Link
              href="/pricing"
              className="mt-8 inline-block border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
            >
              Start Applying
            </Link>
          </div>
        ) : (
          <>
            {/* Stats banner */}
            <div className="mt-10 grid grid-cols-3 gap-0 border border-warm-border">
              <div className="p-6 text-center border-r border-warm-border">
                <p className="font-display text-[36px] font-light text-ink">
                  {placements.length}
                </p>
                <p className="text-[11px] tracking-[0.15em] uppercase text-muted">
                  Placements
                </p>
              </div>
              <div className="p-6 text-center border-r border-warm-border">
                <p className="font-display text-[36px] font-light text-ink">
                  {new Set(placements.map((p) => p.restaurant_city)).size}
                </p>
                <p className="text-[11px] tracking-[0.15em] uppercase text-muted">
                  Cities
                </p>
              </div>
              <div className="p-6 text-center">
                <p className="font-display text-[36px] font-light text-ink">
                  {placements.filter((p) => p.restaurant_stars >= 2).length}
                </p>
                <p className="text-[11px] tracking-[0.15em] uppercase text-muted">
                  2+ Star Kitchens
                </p>
              </div>
            </div>

            {/* Placement cards */}
            <div className="mt-10 space-y-0 border-t border-warm-border">
              {placements.map((p) => (
                <div
                  key={p.id}
                  className="py-8 border-b border-warm-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-[22px] font-light text-ink">
                        {p.chef_slug ? (
                          <Link
                            href={`/chef/${p.chef_slug}`}
                            className="hover:underline underline-offset-4"
                          >
                            {p.chef_name}
                          </Link>
                        ) : (
                          p.chef_name
                        )}
                      </p>
                      <p className="text-[13px] text-muted mt-1">
                        {p.role_title} at{" "}
                        <span className="text-ink">{p.restaurant_name}</span>
                        {p.restaurant_stars > 0 && (
                          <span className="text-amber-600 ml-1">
                            {"★".repeat(p.restaurant_stars)}
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted">
                        {p.restaurant_city}
                      </p>
                    </div>
                    <p className="text-[12px] text-muted shrink-0">
                      {new Date(p.placed_at).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {p.quote && (
                    <blockquote className="mt-4 border-l-2 border-warm-border pl-4 text-[14px] text-muted italic">
                      &ldquo;{p.quote}&rdquo;
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-16 border border-warm-border p-10 text-center">
          <p className="font-display text-[24px] sm:text-[32px] font-light text-ink">
            Want to see your name here?
          </p>
          <p className="text-[13px] text-muted mt-3 max-w-md mx-auto">
            Kitchen Applications helps you apply to the world&apos;s best
            restaurants with AI-personalised cover emails.
          </p>
          <Link
            href="/pricing"
            className="mt-8 inline-block border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
