"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function EmployerSetupPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-5 sm:px-8">
      <div className="w-full max-w-[480px] text-center">
        <span className="text-[10px] tracking-[0.15em] uppercase px-3 py-1 border border-warm-border text-muted inline-block mb-6">
          Coming soon
        </span>
        <h1 className="font-display text-[28px] sm:text-[36px] font-light text-ink leading-tight">
          Employer tools are on the way
        </h1>
        <p className="text-[14px] text-muted mt-4 leading-relaxed">
          We&apos;re building a dedicated hiring dashboard where restaurants can
          receive applications, review chef profiles, and schedule interviews.
        </p>
        <Link
          href="/"
          className="inline-block mt-10 border border-ink px-8 py-3 text-[13px] text-ink hover:bg-ink hover:text-parchment transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
