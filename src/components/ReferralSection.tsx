"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ReferralData {
  code: string;
  referral_url: string;
  stats: {
    total_referrals: number;
    signed_up: number;
    converted: number;
    rewarded: number;
    bonus_applications: number;
  };
}

export function ReferralSection() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function copyLink() {
    if (!data) return;
    await navigator.clipboard.writeText(data.referral_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!data) return;
    const text = `I've been using Kitchen Applications to apply to Michelin-starred restaurants — it writes personalised cover emails and sends them from your Gmail. Try it here: ${data.referral_url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener"
    );
  }

  function shareTwitter() {
    if (!data) return;
    const text = `Found this tool that writes personalised cover emails for chef job applications. Pretty clever — it researches each restaurant first. Check it out:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.referral_url)}`,
      "_blank",
      "noopener"
    );
  }

  if (loading) {
    return (
      <div className="border border-warm-border p-6">
        <p className="text-[13px] text-muted">Loading referral info...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="border border-warm-border">
      <div className="p-6 border-b border-warm-border">
        <h3 className="font-display text-[20px] font-light text-ink">
          Refer a Chef
        </h3>
        <p className="text-[13px] text-muted mt-1">
          When a friend signs up and sends their first application, you both get
          3 bonus applications.
        </p>
      </div>

      <div className="p-6">
        {/* Referral link */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.referral_url}
            className="flex-1 bg-transparent border border-warm-border text-[13px] text-ink px-3 py-2 focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="border border-ink px-4 py-2 text-[13px] text-ink hover:bg-ink hover:text-parchment transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={shareWhatsApp}
            className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <Share2 size={12} />
            WhatsApp
          </button>
          <button
            onClick={shareTwitter}
            className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <Share2 size={12} />
            Twitter
          </button>
        </div>

        {/* Stats */}
        {data.stats.total_referrals > 0 && (
          <div className="mt-6 pt-6 border-t border-warm-border grid grid-cols-3 gap-4">
            <div>
              <p className="font-display text-[28px] font-light text-ink">
                {data.stats.total_referrals}
              </p>
              <p className="text-[11px] text-muted tracking-wide uppercase">
                Referred
              </p>
            </div>
            <div>
              <p className="font-display text-[28px] font-light text-ink">
                {data.stats.converted}
              </p>
              <p className="text-[11px] text-muted tracking-wide uppercase">
                Applied
              </p>
            </div>
            <div>
              <p className="font-display text-[28px] font-light text-ink">
                {data.stats.bonus_applications}
              </p>
              <p className="text-[11px] text-muted tracking-wide uppercase">
                Bonus Apps
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
