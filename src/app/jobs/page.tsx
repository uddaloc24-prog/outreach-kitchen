"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { TopBar } from "@/components/TopBar";
import { JobListingsPage } from "@/components/JobListingsPage";
import { Loader2 } from "lucide-react";
import type { JobListing, JobStarFilter, ScrapeStatus } from "@/types/jobs";

export default function JobsPage() {
  const { data: session, status: authStatus } = useSession();

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [starsFilter, setStarsFilter] = useState<JobStarFilter>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) return;
      const data = await res.json() as { jobs: JobListing[]; scrape_status: ScrapeStatus };
      setJobs(data.jobs ?? []);
      setScrapeStatus(data.scrape_status ?? null);
    } catch {
      setJobs([]);
    }
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) { setLoading(false); return; }
    fetchJobs().finally(() => setLoading(false));
  }, [authStatus, session]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/jobs/scrape", { method: "POST" });
      if (res.status === 429) {
        const d = await res.json() as { seconds_until_refresh?: number };
        setScrapeStatus((prev) => prev
          ? { ...prev, can_refresh: false, seconds_until_refresh: d.seconds_until_refresh ?? 3600 }
          : null
        );
        return;
      }
      await fetchJobs();
    } catch {
      // fetch failed — refresh button will re-enable
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (starsFilter !== "all" && j.restaurant_stars !== parseInt(starsFilter)) return false;
      if (countryFilter !== "all" && j.country !== countryFilter) return false;
      return true;
    });
  }, [jobs, starsFilter, countryFilter]);

  if (authStatus === "loading") {
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
          <h1 className="font-display text-display text-ink">Job Board</h1>
          <p className="text-body text-muted mt-4 max-w-md">
            Sign in to browse active culinary job listings at Michelin-starred kitchens worldwide.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/jobs" })}
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

      {/* Page header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 border-b border-warm-border">
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Live</p>
        <h1 className="font-display text-[24px] sm:text-[36px] font-light text-ink leading-tight">
          Job Board
        </h1>
        <p className="text-[12px] sm:text-[13px] text-muted mt-2 max-w-lg">
          Active culinary openings at Michelin-starred kitchens, scraped from the web.
          Listings are verified and auto-expire when the original post is taken down.
        </p>
      </div>

      <JobListingsPage
        jobs={filtered}
        allJobs={jobs}
        loading={loading}
        refreshing={refreshing}
        scrapeStatus={scrapeStatus}
        starsFilter={starsFilter}
        countryFilter={countryFilter}
        onStarsChange={setStarsFilter}
        onCountryChange={setCountryFilter}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
