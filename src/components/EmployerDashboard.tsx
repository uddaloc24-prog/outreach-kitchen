"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, CheckCircle, XCircle, Calendar, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { EmployerApplication, EmployerStats, EmployerRestaurant, EmployerApplicationStatus } from "@/types";

type StatusFilter = "all" | EmployerApplicationStatus;

const STATUS_LABELS: Record<EmployerApplicationStatus, string> = {
  new: "New",
  interested: "Interested",
  not_a_fit: "Not a fit",
  interviewing: "Interviewing",
};

const STATUS_COLORS: Record<EmployerApplicationStatus, string> = {
  new: "bg-ink/10 text-ink",
  interested: "bg-green-100 text-green-800",
  not_a_fit: "bg-red-100 text-red-700",
  interviewing: "bg-blue-100 text-blue-800",
};

function StarBadge({ stars }: { stars: number }) {
  if (stars === 0) return null;
  return (
    <span className="text-[11px] text-muted">{"★".repeat(stars)}</span>
  );
}

function AvatarCircle({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return (
      <Image src={url} alt={name ?? "chef"} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-warm-border" />
    );
  }
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full border border-warm-border bg-ink/10 flex items-center justify-center text-[14px] font-medium text-ink shrink-0">
      {initial}
    </div>
  );
}

interface ApplicationRowProps {
  app: EmployerApplication;
  onStatusChange: (id: string, status: EmployerApplicationStatus) => Promise<void>;
}

function ApplicationRow({ app, onStatusChange }: ApplicationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleAction(status: EmployerApplicationStatus) {
    setUpdating(true);
    await onStatusChange(app.id, status);
    setUpdating(false);
  }

  const sentDate = app.sent_at
    ? new Date(app.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="border-b border-warm-border last:border-b-0">
      {/* Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-ink/[0.02] transition-colors"
      >
        <AvatarCircle name={app.chef_name} url={app.chef_avatar_url} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-ink truncate">{app.chef_name ?? "Unknown chef"}</p>
          {app.chef_current_role && (
            <p className="text-[12px] text-muted truncate">{app.chef_current_role}</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {sentDate && <p className="text-[12px] text-muted">{sentDate}</p>}
          {app.employer_status ? (
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[app.employer_status]}`}>
              {STATUS_LABELS[app.employer_status]}
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink/10 text-ink">
              New
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted shrink-0" />
        )}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-6 pb-5 border-t border-warm-border/50 bg-parchment">
          {/* Email body */}
          {app.email_body && (
            <div className="mt-4">
              {app.email_subject && (
                <p className="text-[12px] text-muted mb-1">
                  Subject: <span className="text-ink">{app.email_subject}</span>
                </p>
              )}
              <div className="border border-warm-border p-4 text-[13px] text-muted leading-relaxed whitespace-pre-line">
                {app.email_body}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {updating ? (
              <Loader2 size={16} className="animate-spin text-muted" />
            ) : (
              <>
                <button
                  onClick={() => handleAction("interested")}
                  disabled={app.employer_status === "interested"}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 border border-green-600 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                >
                  <CheckCircle size={13} />
                  Interested
                </button>
                <button
                  onClick={() => handleAction("not_a_fit")}
                  disabled={app.employer_status === "not_a_fit"}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 border border-red-400 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <XCircle size={13} />
                  Not a fit
                </button>
                <button
                  onClick={() => handleAction("interviewing")}
                  disabled={app.employer_status === "interviewing"}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 border border-blue-400 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
                >
                  <Calendar size={13} />
                  Schedule interview
                </button>
                {app.chef_slug && (
                  <a
                    href={`/chefs/${app.chef_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 border border-warm-border text-muted hover:text-ink hover:border-ink transition-colors ml-auto"
                  >
                    <ExternalLink size={13} />
                    View profile
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface EmployerDashboardProps {
  restaurant: EmployerRestaurant & { employer_role?: string };
}

export function EmployerDashboard({ restaurant }: EmployerDashboardProps) {
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [stats, setStats] = useState<EmployerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/employer/applications");
      const data = await res.json() as {
        applications?: EmployerApplication[];
        stats?: EmployerStats;
        error?: string;
      };
      if (res.ok) {
        setApplications(data.applications ?? []);
        setStats(data.stats ?? null);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleStatusChange(id: string, status: EmployerApplicationStatus) {
    const res = await fetch(`/api/employer/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, employer_status: status } : a))
      );
      // Update stats
      setStats((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        // Recompute from updated applications
        const updated = applications.map((a) =>
          a.id === id ? { ...a, employer_status: status } : a
        );
        next.interested = updated.filter((a) => a.employer_status === "interested").length;
        next.interviewing = updated.filter((a) => a.employer_status === "interviewing").length;
        return next;
      });
    }
  }

  const filtered = applications.filter((a) => {
    if (filter === "all") return true;
    const effectiveStatus = a.employer_status ?? "new";
    return effectiveStatus === filter;
  });

  const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "interested", label: "Interested" },
    { value: "not_a_fit", label: "Not a fit" },
    { value: "interviewing", label: "Interviewing" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-warm-border">
          {[
            { label: "Total", value: stats.total_applications },
            { label: "New this week", value: stats.new_this_week },
            { label: "Interested", value: stats.interested },
            { label: "Interviewing", value: stats.interviewing },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`p-5 sm:p-6 ${i < 3 ? "border-b sm:border-b-0 sm:border-r border-warm-border" : ""}`}
            >
              <p className="text-[11px] tracking-widest uppercase text-muted">{s.label}</p>
              <p className="font-display text-[36px] font-light text-ink mt-1 leading-none">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Restaurant card */}
      <div className="border border-warm-border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-[20px] sm:text-[24px] font-light text-ink">
                {restaurant.name}
              </h2>
              {restaurant.employer_verified && (
                <span className="text-[10px] tracking-[0.15em] uppercase bg-ink text-parchment px-2 py-0.5">
                  Verified
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted mt-1">
              {restaurant.city}, {restaurant.country}
              {restaurant.cuisine_style && ` · ${restaurant.cuisine_style}`}
            </p>
          </div>
          <StarBadge stars={restaurant.stars} />
        </div>
      </div>

      {/* Filter + list */}
      <div className="border border-warm-border">
        {/* Filter bar */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-warm-border overflow-x-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-[12px] tracking-wide px-3 py-1.5 whitespace-nowrap transition-colors ${
                filter === opt.value
                  ? "bg-ink text-parchment"
                  : "text-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Application list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[14px] text-muted">No applications yet</p>
            <p className="text-[12px] text-muted/60 mt-2">
              Applications will appear here when chefs contact your restaurant.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
