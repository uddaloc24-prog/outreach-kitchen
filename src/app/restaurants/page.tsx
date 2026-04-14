import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { TopBar } from "@/components/TopBar";
import { RestaurantDirectory } from "@/components/RestaurantDirectory";

export const metadata: Metadata = {
  title: "Restaurant Directory — Michelin-Starred Kitchens Worldwide",
  description:
    "Browse our directory of 40+ Michelin-starred restaurants across Europe, Asia, and the Americas. Filter by city, country, and star rating — then apply directly with a personalised cover email.",
  openGraph: {
    title: "Restaurant Directory — Michelin-Starred Kitchens Worldwide",
    description:
      "Browse Michelin-starred restaurants and apply with AI-personalised cover emails.",
  },
};

interface PublicRestaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  head_chef: string | null;
  cuisine_style: string | null;
  website_url: string | null;
  instagram: string | null;
  world_50_rank: number | null;
}

export default async function RestaurantsPage() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("restaurants")
    .select(
      "id, name, city, country, stars, head_chef, cuisine_style, website_url, instagram, world_50_rank"
    )
    .order("stars", { ascending: false })
    .order("name");

  const restaurants: PublicRestaurant[] = data ?? [];

  const cities = Array.from(new Set(restaurants.map((r) => r.city))).sort();
  const countries = Array.from(new Set(restaurants.map((r) => r.country))).sort();

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />
      <RestaurantDirectory
        restaurants={restaurants}
        cities={cities}
        countries={countries}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Michelin-Starred Restaurants",
            description:
              "Directory of Michelin-starred restaurants worldwide for chef job applications.",
            numberOfItems: restaurants.length,
            itemListElement: restaurants.slice(0, 50).map((r, i) => ({
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
                starRating: {
                  "@type": "Rating",
                  ratingValue: r.stars,
                  bestRating: 3,
                },
              },
            })),
          }),
        }}
      />
    </div>
  );
}
