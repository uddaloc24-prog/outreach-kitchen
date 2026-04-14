import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { TopBar } from "@/components/TopBar";
import { BlogContent } from "./BlogContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url: `${SITE_URL}/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${SITE_URL}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const nextPost = currentIndex >= 0 ? allPosts[currentIndex + 1] : undefined;
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : undefined;

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <article className="max-w-[680px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        {/* Header */}
        <Link
          href="/blog"
          className="text-[12px] tracking-[0.15em] uppercase text-muted hover:text-ink transition-colors"
        >
          &larr; All Posts
        </Link>

        <header className="mt-6">
          <p className="text-[11px] tracking-[0.15em] uppercase text-muted">
            {new Date(post.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            <span className="mx-2">&middot;</span>
            {post.author}
          </p>
          <h1 className="font-display text-[32px] sm:text-[48px] font-light text-ink leading-tight mt-3">
            {post.title}
          </h1>
          {post.tags.length > 0 && (
            <div className="flex gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] tracking-wide uppercase text-muted border border-warm-border px-2 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="mt-10">
          <BlogContent content={post.content} />
        </div>

        {/* CTA */}
        <div className="mt-16 border border-warm-border p-8 text-center">
          <p className="font-display text-[20px] font-light text-ink">
            Stop writing applications manually
          </p>
          <p className="text-[13px] text-muted mt-2">
            Kitchen Applications generates personalised cover emails and sends
            them from your Gmail — try it free.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-block border border-ink px-6 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-12 flex items-center justify-between border-t border-warm-border pt-8">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="text-[13px] text-muted hover:text-ink transition-colors"
            >
              &larr; {prevPost.title}
            </Link>
          ) : (
            <span />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="text-[13px] text-muted hover:text-ink transition-colors text-right"
            >
              {nextPost.title} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
              "@type": "Person",
              name: post.author,
            },
            publisher: {
              "@type": "Organization",
              name: "Kitchen Applications",
            },
          }),
        }}
      />
    </div>
  );
}
