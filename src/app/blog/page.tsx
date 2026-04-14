import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Blog — Chef Career Tips & Restaurant Job Advice",
  description:
    "Practical advice for chefs looking for work at Michelin-starred restaurants. Cover letter tips, interview prep, and insider knowledge on landing your dream kitchen job.",
  openGraph: {
    title: "Blog — Chef Career Tips & Restaurant Job Advice",
    description:
      "Practical advice for chefs looking for work at Michelin-starred restaurants.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[820px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <h1 className="font-display text-[36px] sm:text-[56px] font-light text-ink leading-tight">
          The Kitchen Brief
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted mt-4 max-w-lg">
          Career advice, job-hunting strategies, and insider tips for chefs
          applying to the world&apos;s best restaurants.
        </p>

        {posts.length === 0 ? (
          <p className="text-muted text-[14px] mt-16">
            Posts coming soon — check back shortly.
          </p>
        ) : (
          <div className="mt-12 sm:mt-16 space-y-0 border-t border-warm-border">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block py-8 border-b border-warm-border group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] tracking-[0.15em] uppercase text-muted">
                      {new Date(post.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {post.tags.length > 0 && (
                        <span className="ml-3">
                          {post.tags.slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </p>
                    <h2 className="font-display text-[22px] sm:text-[28px] font-light text-ink mt-2 group-hover:underline underline-offset-4">
                      {post.title}
                    </h2>
                    <p className="text-[13px] text-muted mt-2 line-clamp-2">
                      {post.description}
                    </p>
                  </div>
                  <span className="text-[13px] text-muted shrink-0 mt-8 group-hover:text-ink transition-colors">
                    Read &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="border-t border-warm-border bg-parchment">
        <div className="max-w-[820px] mx-auto px-4 sm:px-8 py-16 text-center">
          <p className="font-display text-[24px] sm:text-[32px] font-light text-ink">
            Ready to apply to the world&apos;s best kitchens?
          </p>
          <p className="text-[13px] text-muted mt-3 max-w-md mx-auto">
            Kitchen Applications writes personalised cover emails, sends them
            from your Gmail, and tracks replies — so you can focus on cooking.
          </p>
          <Link
            href="/pricing"
            className="mt-8 inline-block border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
