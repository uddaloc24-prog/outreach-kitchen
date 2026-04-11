"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { JobListing, JobStarFilter, ScrapeStatus } from "@/types/jobs";

function starsDisplay(n: number): string {
  return n > 0 ? "★".repeat(n) : "—";
}

interface JobListingsPageProps {
  jobs: JobListing[];
  allJobs: JobListing[]; // unfiltered, for building the country list
  loading: boolean;
  refreshing: boolean;
  scrapeStatus: ScrapeStatus | null;
  starsFilter: JobStarFilter;
  countryFilter: string;
  onStarsChange: (v: JobStarFilter) => void;
  onCountryChange: (v: string) => void;
  onRefresh: () => void;
}

export function JobListingsPage({
  jobs,
  allJobs,
  loading,
  refreshing,
  scrapeStatus,
  starsFilter,
  countryFilter,
  onStarsChange,
  onCountryChange,
  onRefresh,
}: JobListingsPageProps) {
  const availableCountries = useMemo(() => {
    const set = new Set(allJobs.map((j) => j.country).filter(Boolean));
    return Array.from(set).sort();
  }, [allJobs]);

  const refreshLabel = useMemo(() => {
    if (refreshing) return "Checking listings…";
    if (!scrapeStatus) return "Refresh listings";
    if (scrapeStatus.can_refresh) return "Refresh listings";
    const mins = Math.ceil(scrapeStatus.seconds_until_refresh / 60);
    return `Available in ${mins} min`;
  }, [scrapeStatus, refreshing]);

  const canRefresh = !refreshing && (scrapeStatus?.can_refresh ?? true);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-8 border-b border-warm-border bg-parchment sticky top-14 sm:top-16 z-30">
        {/* Stars */}
        <select
          value={starsFilter}
          onChange={(e) => onStarsChange(e.target.value as JobStarFilter)}
          className="text-[12px] border border-warm-border bg-parchment text-ink px-3 py-2 focus:outline-none focus:border-ink"
        >
          <option value="all">All stars</option>
          <option value="3">★★★ Three stars</option>
          <option value="2">★★ Two stars</option>
          <option value="1">★ One star</option>
        </select>

        {/* Country */}
        <select
          value={countryFilter}
          onChange={(e) => onCountryChange(e.target.value)}
          className="text-[12px] border border-warm-border bg-parchment text-ink px-3 py-2 focus:outline-none focus:border-ink"
        >
          <option value="all">All countries</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="text-[12px] text-muted">
          {loading ? "Loading…" : `${jobs.length} listing${jobs.length !== 1 ? "s" : ""}`}
        </span>

        {/* Refresh — right-aligned */}
        <div className="ml-auto flex items-center gap-2">
          {refreshing && <Loader2 size={12} className="animate-spin text-muted" />}
          <button
            onClick={onRefresh}
            disabled={!canRefresh}
            className="text-[12px] border border-warm-border px-4 py-2 text-ink hover:border-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refreshLabel}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-[28px] font-light italic text-muted">
            No job listings found
          </p>
          <p className="text-[13px] text-muted mt-2">
            Hit Refresh to scrape the latest openings
          </p>
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <table className="w-full border-collapse hidden md:table">
          <thead>
            <tr className="border-b border-warm-border">
              {["Stars", "Restaurant", "Role", "Country", "City", "Head Chef", ""].map((h) => (
                <th
                  key={h}
                  className="px-8 py-3 text-left text-[11px] tracking-[0.12em] uppercase text-muted font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-warm-border/50 hover:bg-warm-border/10 transition-colors"
              >
                <td className="px-8 py-5 text-[14px] text-amber-500 tracking-tight whitespace-nowrap">
                  {starsDisplay(job.restaurant_stars)}
                </td>
                <td className="px-8 py-5 max-w-[200px]">
                  <p className="font-display text-[16px] font-light text-ink leading-snug">
                    {job.restaurant_name}
                  </p>
                  {job.cuisine_style && (
                    <p className="text-[11px] text-muted mt-0.5">{job.cuisine_style}</p>
                  )}
                </td>
                <td className="px-8 py-5 max-w-[180px]">
                  <p className="text-[13px] text-ink">{job.job_title}</p>
                  {job.job_type && job.job_type !== job.job_title && (
                    <p className="text-[11px] text-muted mt-0.5">{job.job_type}</p>
                  )}
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="text-[11px] tracking-wide uppercase border border-warm-border px-2 py-1 text-ink">
                    {job.country || "—"}
                  </span>
                </td>
                <td className="px-8 py-5 text-[13px] text-muted whitespace-nowrap">
                  {job.city || "—"}
                </td>
                <td className="px-8 py-5 text-[13px] text-muted">
                  {job.head_chef ?? "—"}
                </td>
                <td className="px-8 py-5 text-right whitespace-nowrap">
                  {job.apply_url ? (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[12px] border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-parchment transition-colors"
                    >
                      Apply →
                    </a>
                  ) : (
                    <span className="text-[12px] text-muted">No link</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-warm-border/50">
          {jobs.map((job) => (
            <div key={job.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-[12px] shrink-0">
                      {starsDisplay(job.restaurant_stars)}
                    </span>
                    <span className="font-display text-[15px] font-light text-ink truncate">
                      {job.restaurant_name}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink mt-1">{job.job_title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] tracking-wide uppercase border border-warm-border px-1.5 py-0.5 text-ink">
                      {job.country || "—"}
                    </span>
                    <span className="text-[12px] text-muted">{job.city}</span>
                    {job.head_chef && (
                      <span className="text-[12px] text-muted">· {job.head_chef}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {job.apply_url ? (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] border border-ink px-3 py-2 text-ink active:bg-ink active:text-parchment transition-colors"
                    >
                      Apply →
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted">No link</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
