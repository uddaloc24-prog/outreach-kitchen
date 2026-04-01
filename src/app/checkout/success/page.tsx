import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[560px] mx-auto px-8 py-32 text-center">
        <p className="text-[13px] tracking-[0.2em] uppercase text-muted mb-6">Payment confirmed</p>
        <h1 className="font-display text-[56px] font-light text-ink leading-tight">
          Your account is ready.
        </h1>
        <p className="text-body text-muted mt-4">
          Sign in with Google to start applying to the world&apos;s best kitchens.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block text-[13px] tracking-wide bg-ink text-parchment px-10 py-4 hover:bg-ink/90 transition-colors"
        >
          Start applying →
        </Link>
      </main>
    </div>
  );
}
