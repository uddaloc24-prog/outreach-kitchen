import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center">
      <div className="max-w-md mx-auto px-8 text-center">
        <p className="text-[13px] tracking-[0.2em] uppercase text-muted mb-4">Page not found</p>
        <h1 className="font-display text-[48px] font-light text-ink leading-tight mb-4">
          404
        </h1>
        <p className="text-body text-muted mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="text-[13px] tracking-wide border border-ink px-6 py-3 text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Home
          </Link>
          <Link
            href="/jobs"
            className="text-[13px] tracking-wide border border-warm-border px-6 py-3 text-muted hover:border-ink hover:text-ink transition-colors"
          >
            Job Board
          </Link>
        </div>
      </div>
    </div>
  );
}
