"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-parchment border-b border-warm-border">
      <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
        {/* Left: App name */}
        <div className="flex items-center gap-4">
          <span className="font-display text-[24px] font-light italic text-ink">
            Kitchen Applications
          </span>
          {session?.user?.name && (
            <>
              <span className="text-warm-border mx-1">·</span>
              <span className="text-[12px] tracking-widest uppercase text-muted">{session.user.name}</span>
            </>
          )}
        </div>

        {/* Right: Nav + auth */}
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className={cn(
              "text-[13px] tracking-wide transition-colors",
              pathname === "/" ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            Restaurant List
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "text-[13px] tracking-wide transition-colors",
              pathname === "/dashboard" ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            Dashboard
          </Link>
          {session && (
            <Link
              href="/profile"
              className={cn(
                "text-[13px] tracking-wide transition-colors",
                pathname === "/profile" ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              My Profile
            </Link>
          )}

          {!session && (
            <Link
              href="/pricing"
              className={cn(
                "text-[13px] tracking-wide transition-colors",
                pathname === "/pricing" ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              Pricing
            </Link>
          )}

          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut()}
              className="text-[13px] text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="text-[13px] border border-warm-border px-4 py-2 text-ink hover:border-ink transition-colors"
            >
              Sign in with Google
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
