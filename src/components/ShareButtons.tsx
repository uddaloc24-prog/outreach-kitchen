"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareButtonsProps {
  /** The text to share */
  text: string;
  /** The URL to share */
  url: string;
  /** Optional: compact mode (icons only) */
  compact?: boolean;
}

export function ShareButtons({ text, url, compact = false }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      "_blank",
      "noopener"
    );
  }

  function shareTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener"
    );
  }

  function shareTelegram() {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener"
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={shareWhatsApp}
          className="p-2 border border-warm-border hover:border-ink text-muted hover:text-ink transition-colors"
          title="Share on WhatsApp"
        >
          <Share2 size={14} />
        </button>
        <button
          onClick={shareTwitter}
          className="p-2 border border-warm-border hover:border-ink text-muted hover:text-ink transition-colors"
          title="Share on Twitter"
        >
          <Share2 size={14} />
        </button>
        <button
          onClick={copyLink}
          className="p-2 border border-warm-border hover:border-ink text-muted hover:text-ink transition-colors"
          title="Copy link"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={shareWhatsApp}
        className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5 border border-warm-border px-3 py-1.5 hover:border-ink"
      >
        <Share2 size={12} />
        WhatsApp
      </button>
      <button
        onClick={shareTelegram}
        className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5 border border-warm-border px-3 py-1.5 hover:border-ink"
      >
        <Share2 size={12} />
        Telegram
      </button>
      <button
        onClick={shareTwitter}
        className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5 border border-warm-border px-3 py-1.5 hover:border-ink"
      >
        <Share2 size={12} />
        Twitter
      </button>
      <button
        onClick={copyLink}
        className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1.5 border border-warm-border px-3 py-1.5 hover:border-ink"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  );
}
