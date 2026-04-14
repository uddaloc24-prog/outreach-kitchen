import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { getAllPosts } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabase();

  // Chef profile pages
  const { data: chefs } = await supabase
    .from("user_profiles")
    .select("slug, updated_at")
    .not("slug", "is", null);

  const chefPages: MetadataRoute.Sitemap = (chefs ?? []).map((c) => ({
    url: `${SITE_URL}/chef/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Blog posts
  const posts = getAllPosts();
  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // City pages from restaurants
  const { data: cities } = await supabase
    .from("restaurants")
    .select("city");

  const uniqueCities = Array.from(new Set((cities ?? []).map((c) => c.city)));
  const cityPages: MetadataRoute.Sitemap = uniqueCities.map((city) => ({
    url: `${SITE_URL}/restaurants/${city.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/restaurants`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/placements`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...blogPages,
    ...cityPages,
    ...chefPages,
  ];
}
