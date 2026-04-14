"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { TopBar } from "@/components/TopBar";
import { FilterBar } from "@/components/FilterBar";
import { RestaurantTable } from "@/components/RestaurantTable";
import { ResearchPanel } from "@/components/ResearchPanel";
import { CVUploadModal } from "@/components/CVUploadModal";
import { FreeTrialModal } from "@/components/FreeTrialModal";
import { OnboardingView } from "@/components/OnboardingView";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { Loader2 } from "lucide-react";
import {
  TIER_RESTAURANT_ACCESS,
  TIER_STARS_ACCESS,
  type TierKey,
} from "@/lib/pricing-config";
import type {
  RestaurantWithOutreach,
  RegionFilter,
  StarFilter,
  StatusFilter,
  RestaurantTypeFilter,
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

/** Client-side mirror of server-side canAccessRestaurant logic */
function canAccessLocally(
  tier: TierKey | null,
  isInstitute: boolean,
  isFreeTrial: boolean,
  r: RestaurantWithOutreach
): boolean {
  if (isInstitute || isFreeTrial) return true;
  const t: TierKey = tier ?? "starter";
  const allowedTypes = TIER_RESTAURANT_ACCESS[t];
  if (!allowedTypes.includes(r.restaurant_type as never)) return false;
  const allowedStars = TIER_STARS_ACCESS[t];
  if (!allowedStars.includes(r.stars)) return false;
  if (r.world_50_rank !== null && t !== "elite") return false;
  return true;
}

function getRequiredTier(r: RestaurantWithOutreach): TierKey {
  if (r.stars >= 2 || r.world_50_rank !== null) return "elite";
  return "pro";
}

export default function HomePage() {
  const { data: session, status: authStatus } = useSession();

  const [restaurants, setRestaurants] = useState<RestaurantWithOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RestaurantWithOutreach | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [showFreeTrial, setShowFreeTrial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [discoverBatch, setDiscoverBatch] = useState(0);
  const [discovering, setDiscovering] = useState(false);
  const [discoverDone, setDiscoverDone] = useState(false);
  const failedBatchesRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // User tier state
  const [userTier, setUserTier] = useState<TierKey | null>(null);
  const [isInstitute, setIsInstitute] = useState(false);
  const [isFreeTrial, setIsFreeTrial] = useState(false);

  // Upgrade modal state
  const [upgradeTarget, setUpgradeTarget] = useState<{
    restaurant: RestaurantWithOutreach;
    requiredTier: TierKey;
  } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [stars, setStars] = useState<StarFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [restaurantType, setRestaurantType] = useState<RestaurantTypeFilter>("all");

  async function fetchRestaurants() {
    try {
      const res = await fetch("/api/restaurants");
      if (!res.ok) return;
      const data = await res.json();
      setRestaurants(data.restaurants ?? []);
    } catch {
      // fetch failed — restaurants stay empty
    }
  }

  async function checkProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      const profile = data.profile ?? null;
      setUserProfile(profile);

      // New user who hasn't chosen a role → redirect to onboard
      if (profile && !profile.has_chosen_role) {
        window.location.href = "/onboard";
        return;
      }

      if (profile?.user_type === "free_trial") {
        setIsFreeTrial(true);
        if (!localStorage.getItem("onboarding_complete")) {
          setShowOnboarding(true);
        } else if (!localStorage.getItem("free_trial_dismissed")) {
          setShowFreeTrial(true);
        }
      }
    } catch {
      setUserProfile(null);
    }
  }

  async function checkSubscription() {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) return;
      const data = await res.json();
      if (data.user_type === "institute") {
        setIsInstitute(true);
      }
      if (data.subscription?.tier) {
        setUserTier(data.subscription.tier as TierKey);
      }
    } catch {
      // keep defaults
    }
  }

  function handleOnboardingComplete() {
    localStorage.setItem("onboarding_complete", "1");
    setShowOnboarding(false);
    if (!localStorage.getItem("free_trial_dismissed")) {
      setShowFreeTrial(true);
    }
  }

  // Store referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
    }
  }, []);

  // Track referral when user signs in
  useEffect(() => {
    if (!session?.user?.email) return;
    const code = localStorage.getItem("referral_code");
    if (!code) return;

    fetch("/api/referral/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, referee_email: session.user.email }),
    })
      .then(() => localStorage.removeItem("referral_code"))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) { setLoading(false); return; }
    Promise.all([fetchRestaurants(), checkProfile(), checkSubscription()]).finally(() => setLoading(false));
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

  // Auto-discover more restaurants when user scrolls to bottom
  const discoverMore = useCallback(async () => {
    if (discovering || discoverDone || !session) return;
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
          failedBatchesRef.current = 0;
          await fetchRestaurants();
        } else {
          failedBatchesRef.current += 1;
          if (failedBatchesRef.current >= 3) {
            setDiscoverDone(true);
          }
        }
        setDiscoverBatch((b) => b + 1);
      }
    } catch {
      failedBatchesRef.current += 1;
      if (failedBatchesRef.current >= 3) {
        setDiscoverDone(true);
      }
    } finally {
      setDiscovering(false);
    }
  }, [discovering, discoverDone, discoverBatch, session]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!session || loading) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          discoverMore();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [session, loading, discoverMore]);

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
      if (restaurantType !== "all" && r.restaurant_type !== restaurantType) return false;
      return true;
    });
  }, [restaurants, search, stars, region, statusFilter, restaurantType]);

  // Compute lock status for each restaurant
  const withLockStatus = useMemo(() => {
    return filtered.map((r) => {
      const locked = !canAccessLocally(userTier, isInstitute, isFreeTrial, r);
      return {
        ...r,
        locked,
        lock_reason: locked ? `Upgrade to ${getRequiredTier(r) === "elite" ? "Elite" : "Pro"}` : undefined,
      };
    });
  }, [filtered, userTier, isInstitute, isFreeTrial]);

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
          <div className="mt-12 flex gap-6 text-[12px] text-muted">
            <a href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-ink transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    );
  }

  // New free_trial user who hasn't seen onboarding yet
  if (showOnboarding) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  function handleRestaurantSelect(r: RestaurantWithOutreach) {
    if (r.locked) {
      setUpgradeTarget({
        restaurant: r,
        requiredTier: getRequiredTier(r),
      });
    } else {
      setSelected(r);
    }
  }

  function handleUpgradeFromPanel(requiredTier: string) {
    if (selected) {
      setUpgradeTarget({
        restaurant: selected,
        requiredTier: requiredTier as TierKey,
      });
    }
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      {/* Free trial welcome modal */}
      {showFreeTrial && (
        <FreeTrialModal
          onContinue={() => {
            localStorage.setItem("free_trial_dismissed", "1");
            setShowFreeTrial(false);
          }}
        />
      )}

      {/* CV upload modal — shown if profile not set up */}
      {userProfile === null && (
        <CVUploadModal
          onComplete={(profile) => setUserProfile(profile)}
        />
      )}

      {/* Upgrade prompt modal */}
      {upgradeTarget && (
        <UpgradePromptModal
          restaurant={upgradeTarget.restaurant}
          requiredTier={upgradeTarget.requiredTier}
          currentTier={userTier ?? (isFreeTrial ? "free_trial" : null)}
          onClose={() => setUpgradeTarget(null)}
        />
      )}

      {/* Filter bar */}
      <FilterBar
        search={search}
        stars={stars}
        region={region}
        status={statusFilter}
        restaurantType={restaurantType}
        onSearchChange={setSearch}
        onStarsChange={setStars}
        onRegionChange={setRegion}
        onStatusChange={setStatusFilter}
        onRestaurantTypeChange={setRestaurantType}
      />

      {/* AI search indicator */}
      {aiSearching && (
        <div className="px-8 py-2 border-b border-warm-border/50">
          <span className="text-small text-muted flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Searching with AI…
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : (
        <RestaurantTable
          restaurants={withLockStatus}
          onSelect={handleRestaurantSelect}
        />
      )}

      {/* Infinite scroll sentinel */}
      {!loading && filtered.length > 0 && !discoverDone && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          {discovering && (
            <span className="text-small text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Discovering more restaurants…
            </span>
          )}
        </div>
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
          onUpgradeRequired={(requiredTier) => {
            setUpgradeTarget({
              restaurant: selected,
              requiredTier: requiredTier as TierKey,
            });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
