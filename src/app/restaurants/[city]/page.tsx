import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { TopBar } from "@/components/TopBar";

interface PageProps {
  params: Promise<{ city: string }>;
}

/** Build static pages for every city in the database */
export async function generateStaticParams() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("restaurants")
    .select("city")
    .order("city");

  const cities = Array.from(new Set((data ?? []).map((r) => r.city)));
  return cities.map((city) => ({
    city: city.toLowerCase().replace(/\s+/g, "-"),
  }));
}

function slugToCity(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = slugToCity(slug);
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

  return {
    title: `Chef Jobs in ${city} — Michelin-Starred Restaurants Hiring`,
    description: `Find chef positions at Michelin-starred restaurants in ${city}. Browse openings, research kitchens, and apply with AI-personalised cover emails.`,
    openGraph: {
      title: `Chef Jobs in ${city} — Michelin-Starred Restaurants Hiring`,
      description: `Browse Michelin-starred restaurants in ${city} and apply with personalised cover emails.`,
      url: `${SITE_URL}/restaurants/${slug}`,
    },
    alternates: {
      canonical: `${SITE_URL}/restaurants/${slug}`,
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { city: slug } = await params;
  const city = slugToCity(slug);

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("restaurants")
    .select(
      "id, name, city, country, stars, head_chef, cuisine_style, website_url, instagram, world_50_rank"
    )
    .ilike("city", city)
    .order("stars", { ascending: false })
    .order("name");

  const restaurants = data ?? [];
  if (restaurants.length === 0) notFound();

  const country = restaurants[0].country;

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      <main className="max-w-[820px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <Link
          href="/restaurants"
          className="text-[12px] tracking-[0.15em] uppercase text-muted hover:text-ink transition-colors"
        >
          &larr; All Restaurants
        </Link>

        <h1 className="font-display text-[36px] sm:text-[56px] font-light text-ink leading-tight mt-6">
          Chef Jobs in {city}
        </h1>
        <p className="text-[14px] text-muted mt-4 max-w-lg">
          {restaurants.length} Michelin-starred restaurant
          {restaurants.length !== 1 ? "s" : ""} in {city}, {country}. Apply
          with a personalised cover email powered by AI.
        </p>

        {/* Restaurants */}
        <div className="mt-10 border-t border-warm-border">
          {restaurants.map((r) => (
            <div
              key={r.id}
              className="py-6 border-b border-warm-border flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[22px] font-light text-ink">
                    {r.name}
                  </h2>
                  {r.stars > 0 && (
                    <span className="text-[14px] text-amber-600">
                      {"★".repeat(r.stars)}
                    </span>
                  )}
                </div>
                {r.cuisine_style && (
                  <p className="text-[13px] text-muted italic mt-0.5">
                    {r.cuisine_style}
                  </p>
                )}
                {r.head_chef && (
                  <p className="text-[13px] text-muted mt-1">
                    Head Chef: {r.head_chef}
                  </p>
                )}
                {r.world_50_rank && (
                  <p className="text-[12px] text-muted mt-0.5">
                    World&apos;s 50 Best #{r.world_50_rank}
                  </p>
                )}
                <div className="flex gap-3 mt-2">
                  {r.website_url && (
                    <a
                      href={r.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      Website &rarr;
                    </a>
                  )}
                  {r.instagram && (
                    <a
                      href={`https://instagram.com/${r.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* City-specific CTA */}
        <div className="mt-12 border border-warm-border p-8 text-center">
          <p className="font-display text-[20px] font-light text-ink">
            Apply to restaurants in {city}
          </p>
          <p className="text-[13px] text-muted mt-2">
            Kitchen Applications researches each restaurant and writes a
            personalised cover email — sent from your own Gmail. Try it free.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-block border border-ink px-6 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Michelin-Starred Restaurants in ${city}`,
            numberOfItems: restaurants.length,
            itemListElement: restaurants.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Restaurant",
                name: r.name,
                address: {
                  "@type": "PostalAddress",
                  addressLocality: r.city,
                  addressCountry: r.country,
                },
              },
            })),
          }),
        }}
      />
    </div>
  );
}
