"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { DashboardStatsRow } from "@/components/DashboardStats";
import { FollowUpQueue } from "@/components/FollowUpQueue";
import { StatusBadge } from "@/components/ui/badge";
import { starsDisplay, formatDate } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { RestaurantWithOutreach, DashboardStats } from "@/types";
import { ReferralSection } from "@/components/ReferralSection";

function LogRow({
  r,
  onMarkReplied,
}: {
  r: RestaurantWithOutreach;
  onMarkReplied: (outreachId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const log = r.outreach_log as unknown as Record<string, string> | undefined;
  const subject = log?.email_subject;
  const body = log?.email_body;
  const outreachId = log?.id;
  const status = r.outreach_log?.status ?? "not_contacted";

  return (
    <>
      <tr
        className="border-b border-warm-border/50 hover:bg-surface transition-colors cursor-pointer"
        onClick={() => body && setExpanded((v) => !v)}
      >
        <td className="px-6 py-3 text-small text-muted whitespace-nowrap">
          {r.outreach_log?.sent_at ? formatDate(r.outreach_log.sent_at) : "—"}
        </td>
        <td className="px-4 py-3">
          <span className="font-display text-[16px] text-ink">{r.name}</span>
          <span className="text-small text-muted ml-2">{r.city}</span>
        </td>
        <td className="px-4 py-3 text-small text-ink max-w-[300px] truncate">
          {subject ?? "—"}
        </td>
        <td className="px-4 py-3">
          <span className="text-gold text-[13px]">{starsDisplay(r.stars)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {status === "sent" && outreachId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkReplied(outreachId);
                }}
                className="text-[11px] text-muted hover:text-ink underline decoration-dotted underline-offset-2"
              >
                Mark replied
              </button>
            )}
            {body && (
              expanded
                ? <ChevronUp size={12} className="text-muted" />
                : <ChevronDown size={12} className="text-muted" />
            )}
          </div>
        </td>
      </tr>
      {expanded && body && (
        <tr className="border-b border-warm-border/50 bg-surface">
          <td colSpan={5} className="px-6 py-4">
            <pre className="text-small text-ink whitespace-pre-wrap font-sans leading-relaxed max-w-[800px]">
              {body}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<RestaurantWithOutreach[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    sent: 0,
    replied: 0,
    followup_due: 0,
    draft_ready: 0,
    researching: 0,
    user_type: null,
    applications_remaining: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  async function fetchData() {
    const [statsRes, logRes] = await Promise.all([
      fetch("/api/dashboard/stats"),
      fetch("/api/dashboard/log"),
    ]);

    const statsData = await statsRes.json();
    setStats(statsData);

    const logData = await logRes.json();
    if (logData.log) {
      const normalized: RestaurantWithOutreach[] = logData.log.map(
        (entry: { restaurants: Record<string, unknown>; [key: string]: unknown }) => {
          const { restaurants: restaurantData, ...logFields } = entry;
          return {
            ...(restaurantData as Record<string, unknown>),
            outreach_log: logFields,
          } as unknown as RestaurantWithOutreach;
        }
      );
      setRestaurants(normalized);
    }
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) return;
    fetchData().finally(() => setLoading(false));
  }, [authStatus, session]);

  async function markReplied(outreachId: string) {
    try {
      const res = await fetch(`/api/outreach/${outreachId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "replied" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to mark replied");
      }
      toast.success("Marked as replied");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  const followUps = restaurants.filter(
    (r) => r.outreach_log?.status === "followup_due"
  );

  const log = restaurants
    .filter((r) => r.outreach_log?.status && r.outreach_log.status !== "not_contacted")
    .sort((a, b) => {
      const dateA = a.outreach_log?.sent_at ?? a.outreach_log?.created_at ?? "";
      const dateB = b.outreach_log?.sent_at ?? b.outreach_log?.created_at ?? "";
      return dateB.localeCompare(dateA);
    });

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label text-muted">Outreach</p>
            <h1 className="font-display text-h1 text-ink mt-1">Dashboard</h1>
          </div>
        </div>

        {/* Stats */}
        <DashboardStatsRow stats={stats} />

        {/* Follow-up Queue */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-h2 text-ink">Follow-up Queue</h2>
            {followUps.length > 0 && (
              <Badge variant="rust">{followUps.length}</Badge>
            )}
          </div>
          <FollowUpQueue restaurants={followUps} onUpdate={fetchData} />
        </div>

        {/* Referral */}
        <ReferralSection />

        {/* Full outreach log */}
        <div>
          <h2 className="font-display text-h2 text-ink mb-4">Outreach Log</h2>
          <table className="w-full border-collapse border border-warm-border">
            <thead>
              <tr className="bg-surface border-b border-warm-border">
                <th className="text-left px-6 py-3 text-label text-muted w-[120px]">Date</th>
                <th className="text-left px-4 py-3 text-label text-muted">Restaurant</th>
                <th className="text-left px-4 py-3 text-label text-muted">Subject</th>
                <th className="text-left px-4 py-3 text-label text-muted w-[80px]">Stars</th>
                <th className="text-left px-4 py-3 text-label text-muted w-[160px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted text-body">
                    No emails sent yet.
                  </td>
                </tr>
              ) : (
                log.map((r) => (
                  <LogRow key={r.id} r={r} onMarkReplied={markReplied} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
