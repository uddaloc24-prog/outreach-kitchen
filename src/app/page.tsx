"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { TopBar } from "@/components/TopBar";
import { FilterBar } from "@/components/FilterBar";
import { RestaurantTable } from "@/components/RestaurantTable";
import { ResearchPanel } from "@/components/ResearchPanel";
import { CVUploadModal } from "@/components/CVUploadModal";
import { Loader2 } from "lucide-react";
import type {
  RestaurantWithOutreach,
  RegionFilter,
  StarFilter,
  StatusFilter,
  UserProfile,
} from "@/types";

const REGION_TO_COUNTRIES: Record<string, string[]> = {
  Europe: [
    "Denmark", "Spain", "United Kingdom", "France", "Italy", "Norway", "Sweden",
    "Finland", "Iceland", "Germany", "Netherlands", "Belgium", "Portugal",
    "Switzerland", "Austria", "Greece", "Poland", "Czech Republic", "Hungary",
    "Croatia", "Slovenia", "Romania", "Bulgaria", "Serbia", "Ireland",
    "Scotland", "Wales", "Luxembourg", "Monaco", "Andorra", "Malta",
  ],
  Asia: [
    "Japan", "China", "South Korea", "India", "Thailand", "Singapore",
    "Hong Kong", "Taiwan", "Vietnam", "Indonesia", "Malaysia", "Philippines",
    "Bangladesh", "Sri Lanka", "Nepal", "Pakistan", "Myanmar", "Cambodia",
    "Laos", "Brunei", "Maldives", "Mongolia",
  ],
  Americas: [
    "United States", "USA", "Canada", "Mexico", "Brazil", "Argentina",
    "Peru", "Colombia", "Chile", "Ecuador", "Bolivia", "Uruguay", "Paraguay",
    "Venezuela", "Cuba", "Jamaica", "Trinidad and Tobago", "Costa Rica",
    "Panama", "Guatemala", "Honduras", "El Salvador", "Nicaragua",
  ],
  "Middle East & Africa": [
    "South Africa", "UAE", "United Arab Emirates", "Saudi Arabia", "Israel",
    "Morocco", "Egypt", "Nigeria", "Kenya", "Ethiopia", "Ghana", "Tanzania",
    "Uganda", "Senegal", "Ivory Coast", "Cameroon", "Tunisia", "Algeria",
    "Lebanon", "Jordan", "Qatar", "Kuwait", "Bahrain", "Oman", "Turkey",
    "Iran", "Iraq", "Zimbabwe", "Zambia", "Rwanda", "Mauritius",
  ],
  Oceania: ["Australia", "New Zealand", "Fiji", "Papua New Guinea"],
};

export default function HomePage() {
  const { data: session, status: authStatus } = useSession();

  const [restaurants, setRestaurants] = useState<RestaurantWithOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RestaurantWithOutreach | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [aiSearching, setAiSearching] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters — default all stars visible
  const [search, setSearch] = useState("");
  const [stars, setStars] = useState<StarFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function fetchRestaurants() {
    try {
      const res = await fetch("/api/restaurants");
      if (!res.ok) return;
      const data = await res.json();
      setRestaurants(data.restaurants ?? []);
    } catch {
      console.error("[page] Failed to fetch restaurants");
    }
  }

  async function checkProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setUserProfile(data.profile ?? null);
    } catch {
      setUserProfile(null);
    }
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) { setLoading(false); return; }
    Promise.all([fetchRestaurants(), checkProfile()]).finally(() => setLoading(false));
  }, [authStatus, session]);

  // AI-powered search: trigger Groq when user types 2+ chars
  useEffect(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (!session || search.length < 2) return;

    aiTimerRef.current = setTimeout(async () => {
      setAiSearching(true);
      try {
        const res = await fetch(`/api/restaurants/search?q=${encodeURIComponent(search)}`);
        if (!res.ok) return;
        const data = await res.json();
        const newItems: RestaurantWithOutreach[] = (data.restaurants ?? []).map(
          (r: RestaurantWithOutreach & { outreach_log: unknown }) => {
            const logs = Array.isArray(r.outreach_log) ? r.outreach_log : [];
            const latest = (logs as Array<{ created_at: string }>).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0] ?? null;
            return { ...r, outreach_log: latest };
          }
        );
        setRestaurants((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const toAdd = newItems.filter((r) => !existingIds.has(r.id));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      } catch {
        // silently ignore AI search errors
      } finally {
        setAiSearching(false);
      }
    }, 800);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [search, session]);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !(r.head_chef ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (stars !== "all" && r.stars !== parseInt(stars)) return false;
      // When searching by name, region filter is ignored — name search is global
      if (!search && region !== "all") {
        const countries = REGION_TO_COUNTRIES[region] ?? [];
        if (!countries.includes(r.country)) return false;
      }
      if (statusFilter !== "all") {
        const rStatus = r.outreach_log?.status ?? "not_contacted";
        if (rStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [restaurants, search, stars, region, statusFilter]);

  if (authStatus === "loading" || (session && userProfile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-parchment">
        <TopBar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
          <h1 className="font-display text-display text-ink">
            Kitchen Applications
          </h1>
          <p className="text-body text-muted mt-4 max-w-md">
            Your personal outreach machine for Michelin-starred kitchen applications.
            Sign in with Google to connect your Gmail and begin.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="mt-8 border border-ink px-8 py-3 text-body text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      {/* CV upload modal — shown if profile not set up */}
      {userProfile === null && (
        <CVUploadModal
          onComplete={(profile) => setUserProfile(profile)}
        />
      )}

      {/* Filter bar */}
      <FilterBar
        search={search}
        stars={stars}
        region={region}
        status={statusFilter}
        onSearchChange={setSearch}
        onStarsChange={setStars}
        onRegionChange={setRegion}
        onStatusChange={setStatusFilter}
      />

      {/* Count line */}
      <div className="px-8 py-3 border-b border-warm-border/50 flex items-center gap-3">
        <span className="text-small text-muted">
          {loading ? "Loading…" : `${filtered.length} restaurant${filtered.length !== 1 ? "s" : ""}`}
        </span>
        {aiSearching && (
          <span className="text-small text-muted flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Searching with AI…
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : (
        <RestaurantTable
          restaurants={filtered}
          onSelect={(r) => setSelected(r)}
        />
      )}

      {/* Research Panel (Screen 2 + 3) */}
      {selected && (
        <ResearchPanel
          restaurant={selected}
          onClose={() => setSelected(null)}
          onStatusChange={() => {
            fetchRestaurants();
            const updated = restaurants.find((r) => r.id === selected.id);
            if (updated) setSelected(updated);
          }}
        />
      )}
    </div>
  );
}
