"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import type { RestaurantType } from "@/types";

const TYPE_LABELS: Record<RestaurantType, string> = {
  fine_dining: "Fine Dining",
  casual_dining: "Casual",
  bistro: "Bistro",
  cafe_bakery: "Cafe & Bakery",
  hotel_restaurant: "Hotel",
  popup: "Pop-up",
  local_eatery: "Local Eatery",
};

interface PublicRestaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  restaurant_type: string | null;
  head_chef: string | null;
  cuisine_style: string | null;
  website_url: string | null;
  instagram: string | null;
  world_50_rank: number | null;
}

interface Props {
  restaurants: PublicRestaurant[];
  cities: string[];
  countries: string[];
}

function StarDisplay({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted text-[12px]">&mdash;</span>;
  return (
    <span className="text-[14px] text-amber-600">
      {"★".repeat(count)}
    </span>
  );
}

export function RestaurantDirectory({ restaurants: initial }: Props) {
  const { data: session } = useSession();
  const [restaurants, setRestaurants] = useState(initial);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [starsFilter, setStarsFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [discoverBatch, setDiscoverBatch] = useState(0);
  const [discovering, setDiscovering] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Derive filter options from current restaurant list
  const cities = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.city))).sort(),
    [restaurants]
  );
  const countries = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.country))).sort(),
    [restaurants]
  );

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !(r.head_chef ?? "").toLowerCase().includes(q) &&
          !(r.cuisine_style ?? "").toLowerCase().includes(q) &&
          !r.city.toLowerCase().includes(q) &&
          !r.country.toLowerCase().includes(q)
        )
          return false;
      }
      if (cityFilter !== "all" && r.city !== cityFilter) return false;
      if (countryFilter !== "all" && r.country !== countryFilter) return false;
      if (starsFilter !== "all" && r.stars !== parseInt(starsFilter)) return false;
      if (typeFilter !== "all" && r.restaurant_type !== typeFilter) return false;
      return true;
    });
  }, [restaurants, search, cityFilter, countryFilter, starsFilter, typeFilter]);

  // Refresh restaurants from API after discover
  async function refreshRestaurants() {
    try {
      const res = await fetch("/api/restaurants/public");
      if (res.ok) {
        const data = await res.json() as { restaurants: PublicRestaurant[] };
        setRestaurants(data.restaurants ?? []);
      }
    } catch {
      // keep existing data
    }
  }

  const discoverMore = useCallback(async () => {
    if (discovering || !session) return;
    setDiscovering(true);
    try {
      const res = await fetch("/api/restaurants/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: discoverBatch }),
      });
      if (res.ok) {
        const data = await res.json() as { added: number };
        if (data.added > 0) {
          await refreshRestaurants();
        }
        setDiscoverBatch((b) => b + 1);
      }
    } catch {
      // silently ignore
    } finally {
      setDiscovering(false);
    }
  }, [discovering, discoverBatch, session]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && session) {
          discoverMore();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [session, discoverMore]);

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
      <div className="mb-10">
        <h1 className="font-display text-[36px] sm:text-[56px] font-light text-ink leading-tight">
          Restaurant Directory
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted mt-4 max-w-lg">
          Browse restaurants and kitchens worldwide — from Michelin-starred fine dining
          to local eateries. Sign up to apply with AI-personalised cover emails sent
          from your Gmail.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center border-y border-warm-border py-4 mb-8">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search restaurants, chefs, cuisines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-transparent border border-warm-border text-[13px] text-ink placeholder:text-muted focus:outline-none focus:border-ink"
          />
        </div>
        <select
          value={starsFilter}
          onChange={(e) => setStarsFilter(e.target.value)}
          className="bg-transparent border border-warm-border text-[13px] text-ink px-3 py-2 focus:outline-none"
        >
          <option value="all">All stars</option>
          <option value="3">★★★</option>
          <option value="2">★★</option>
          <option value="1">★</option>
          <option value="0">No stars</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-transparent border border-warm-border text-[13px] text-ink px-3 py-2 focus:outline-none"
        >
          <option value="all">All types</option>
          <option value="fine_dining">Fine Dining</option>
          <option value="casual_dining">Casual Dining</option>
          <option value="bistro">Bistro</option>
          <option value="cafe_bakery">Cafe & Bakery</option>
          <option value="hotel_restaurant">Hotel Restaurant</option>
          <option value="popup">Pop-up</option>
          <option value="local_eatery">Local Eatery</option>
        </select>
        <select
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value);
            setCityFilter("all");
          }}
          className="bg-transparent border border-warm-border text-[13px] text-ink px-3 py-2 focus:outline-none"
        >
          <option value="all">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="bg-transparent border border-warm-border text-[13px] text-ink px-3 py-2 focus:outline-none"
        >
          <option value="all">All cities</option>
          {cities
            .filter(
              (c) =>
                countryFilter === "all" ||
                restaurants.some(
                  (r) => r.city === c && r.country === countryFilter
                )
            )
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted text-[14px] py-16 text-center">
          No restaurants match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-warm-border">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              className={`p-6 flex flex-col ${
                i < filtered.length - 1 ? "border-b sm:border-b" : ""
              } ${(i + 1) % 3 !== 0 ? "lg:border-r" : ""} ${
                (i + 1) % 2 !== 0 ? "sm:border-r lg:border-r-0" : ""
              } ${(i + 1) % 3 !== 0 ? "lg:border-r" : ""} border-warm-border`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[20px] font-light text-ink leading-tight">
                  {r.name}
                </h3>
                <StarDisplay count={r.stars} />
              </div>
              <p className="text-[12px] text-muted mt-1">
                {r.city}, {r.country}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {r.cuisine_style && (
                  <p className="text-[12px] text-muted italic">
                    {r.cuisine_style}
                  </p>
                )}
                {r.restaurant_type && (
                  <span className="text-[10px] text-muted/60 uppercase tracking-wide">
                    {TYPE_LABELS[r.restaurant_type as RestaurantType] ?? ""}
                  </span>
                )}
              </div>
              {r.head_chef && (
                <p className="text-[12px] text-muted mt-2">
                  Chef: {r.head_chef}
                </p>
              )}
              {r.world_50_rank && (
                <p className="text-[11px] text-muted mt-0.5">
                  World&apos;s 50 Best #{r.world_50_rank}
                </p>
              )}
              <div className="flex items-center gap-3 mt-auto pt-4">
                {r.website_url && (
                  <a
                    href={r.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-ink transition-colors"
                  >
                    Website &rarr;
                  </a>
                )}
                {r.instagram && (
                  <a
                    href={`https://instagram.com/${r.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-ink transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="flex items-center justify-center py-8">
        {discovering && (
          <span className="text-[13px] text-muted flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Discovering more restaurants…
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 border border-warm-border p-10 text-center">
        <p className="font-display text-[24px] sm:text-[32px] font-light text-ink">
          Apply to any of these restaurants in minutes
        </p>
        <p className="text-[13px] text-muted mt-3 max-w-md mx-auto">
          Kitchen Applications researches the restaurant, writes a personalised
          cover email, and sends it from your Gmail. Your first application is free.
        </p>
        <Link
          href="/pricing"
          className="mt-8 inline-block border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
        >
          Get Started Free
        </Link>
      </div>
    </main>
  );
}
