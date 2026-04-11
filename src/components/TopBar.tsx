"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function TopBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserType(d.profile?.user_type ?? null))
      .catch(() => {});
  }, [session]);

  const isEmployer = userType === "employer";

  const navLinks = [
    { href: "/", label: "Restaurant List", chefOnly: true },
    { href: "/dashboard", label: "Dashboard", chefOnly: true },
    { href: "/employer", label: "Inbox", employerOnly: true },
    { href: "/jobs", label: "Job Board", authOnly: true },
    { href: "/profile", label: "My Profile", chefOnly: true },
    { href: "/pricing", label: "Pricing", unauthOnly: true },
  ];

  const visibleLinks = navLinks.filter((l: typeof navLinks[number]) => {
    if (l.authOnly && !session) return false;
    if (l.unauthOnly && session) return false;
    if (l.chefOnly && (!session || isEmployer)) return false;
    if (l.employerOnly && (!session || !isEmployer)) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 bg-parchment border-b border-warm-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: App name */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="font-display text-[18px] sm:text-[24px] font-light italic text-ink shrink-0">
            Kitchen Applications
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[13px] tracking-wide transition-colors",
                pathname === link.href ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut()}
              className="text-[13px] text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="text-[13px] border border-warm-border px-4 py-2 text-ink hover:border-ink transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => signIn("google", { callbackUrl: "/onboard" })}
                className="text-[13px] border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-parchment transition-colors"
              >
                I'm hiring
              </button>
            </div>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-ink"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-warm-border bg-parchment px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "text-[14px] tracking-wide py-3 px-2 border-b border-warm-border/50 transition-colors",
                  pathname === link.href ? "text-ink font-medium" : "text-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            {status === "loading" ? null : session ? (
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="text-left text-[14px] text-muted py-3 px-2"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => { signIn("google", { callbackUrl: "/" }); setMenuOpen(false); }}
                className="text-[14px] border border-ink px-4 py-3 mt-2 text-ink text-center"
              >
                Sign in with Google
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
