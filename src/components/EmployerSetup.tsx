"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { Restaurant } from "@/types";
import type { EmployerRole } from "@/types";

const ROLES: { value: EmployerRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "head_chef", label: "Head Chef" },
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
];

const STAR_OPTIONS = [
  { value: "0", label: "No stars" },
  { value: "1", label: "1 star" },
  { value: "2", label: "2 stars" },
  { value: "3", label: "3 stars" },
];

interface RestaurantResult extends Restaurant {
  selected?: boolean;
}

export function EmployerSetup() {
  const router = useRouter();

  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[] | null>(null);
  const [fetchingRestaurants, setFetchingRestaurants] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Create new mode
  const [createMode, setCreateMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCuisine, setNewCuisine] = useState("");
  const [newStars, setNewStars] = useState("0");

  // Shared
  const [role, setRole] = useState<EmployerRole>("owner");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureRestaurantsLoaded() {
    if (allRestaurants !== null) return;
    setFetchingRestaurants(true);
    try {
      const res = await fetch("/api/restaurants");
      const data = await res.json() as { restaurants?: Restaurant[] };
      setAllRestaurants(data.restaurants ?? []);
    } catch {
      setAllRestaurants([]);
    } finally {
      setFetchingRestaurants(false);
    }
  }

  async function handleSearchFocus() {
    await ensureRestaurantsLoaded();
    setShowDropdown(true);
  }

  const filteredResults = useMemo<RestaurantResult[]>(() => {
    if (!allRestaurants || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allRestaurants
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allRestaurants, searchQuery]);

  function handleSelectRestaurant(r: Restaurant) {
    setSelectedRestaurant(r);
    setSearchQuery(r.name);
    setShowDropdown(false);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      let body: Record<string, unknown>;

      if (createMode) {
        if (!newName.trim() || !newCity.trim() || !newCountry.trim()) {
          setError("Restaurant name, city, and country are required.");
          setSubmitting(false);
          return;
        }
        body = {
          restaurant_name: newName.trim(),
          city: newCity.trim(),
          country: newCountry.trim(),
          cuisine_style: newCuisine.trim() || undefined,
          stars: parseInt(newStars, 10),
          employer_role: role,
        };
      } else {
        if (!selectedRestaurant) {
          setError("Please select a restaurant from the list.");
          setSubmitting(false);
          return;
        }
        body = {
          restaurant_id: selectedRestaurant.id,
          employer_role: role,
        };
      }

      const res = await fetch("/api/employer/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      router.push("/employer");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-5 sm:px-8 py-12">
      <div className="w-full max-w-[520px]">
        {/* Header */}
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4">
          Employer setup
        </p>
        <h1 className="font-display text-[28px] sm:text-[38px] font-light text-ink leading-tight">
          Find your restaurant
        </h1>
        <p className="text-[13px] text-muted mt-3 leading-relaxed">
          Search for your restaurant by name, or add it if it&apos;s not listed.
        </p>

        <div className="mt-10 space-y-6">
          {!createMode ? (
            /* Search mode */
            <div className="relative">
              <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                Restaurant name
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedRestaurant(null);
                    setShowDropdown(true);
                  }}
                  onFocus={handleSearchFocus}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search by restaurant name…"
                  className="w-full pl-9 pr-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:border-ink"
                />
                {fetchingRestaurants && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && filteredResults.length > 0 && (
                <div className="absolute z-10 w-full top-full mt-0 border border-warm-border border-t-0 bg-parchment shadow-lg">
                  {filteredResults.map((r) => (
                    <button
                      key={r.id}
                      onMouseDown={() => handleSelectRestaurant(r)}
                      className="w-full text-left px-4 py-3 border-b border-warm-border/50 last:border-b-0 hover:bg-ink/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] text-ink">{r.name}</span>
                        <span className="text-[11px] text-muted shrink-0">
                          {r.city}, {r.country}
                          {r.stars > 0 && ` · ${"★".repeat(r.stars)}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRestaurant && (
                <p className="mt-2 text-[12px] text-muted">
                  Selected: <span className="text-ink">{selectedRestaurant.name}</span> — {selectedRestaurant.city}, {selectedRestaurant.country}
                </p>
              )}

              <button
                onClick={() => setCreateMode(true)}
                className="mt-3 text-[12px] text-muted hover:text-ink transition-colors underline underline-offset-4"
              >
                My restaurant isn&apos;t listed →
              </button>
            </div>
          ) : (
            /* Create new mode */
            <div className="space-y-4">
              <div>
                <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                  Restaurant name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. The Oak Room"
                  className="w-full px-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:border-ink"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. London"
                    className="w-full px-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g. United Kingdom"
                    className="w-full px-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:border-ink"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                    Cuisine style
                  </label>
                  <input
                    type="text"
                    value={newCuisine}
                    onChange={(e) => setNewCuisine(e.target.value)}
                    placeholder="e.g. Modern British"
                    className="w-full px-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="w-36">
                  <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
                    Stars
                  </label>
                  <select
                    value={newStars}
                    onChange={(e) => setNewStars(e.target.value)}
                    className="w-full px-4 py-3 border border-warm-border bg-parchment text-ink text-[14px] focus:outline-none focus:border-ink"
                  >
                    {STAR_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setCreateMode(false)}
                className="text-[12px] text-muted hover:text-ink transition-colors underline underline-offset-4"
              >
                ← Search existing restaurants
              </button>
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="text-[11px] tracking-widest uppercase text-muted block mb-2">
              Your role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`px-4 py-2 text-[12px] tracking-wide border transition-colors ${
                    role === r.value
                      ? "border-ink bg-ink text-parchment"
                      : "border-warm-border text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-red-600">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Setting up…
              </span>
            ) : (
              "Complete setup →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
