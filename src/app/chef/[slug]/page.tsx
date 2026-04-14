import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { ChefProfile } from "@/components/ChefProfile";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, avatar_url, parsed_profile")
    .eq("slug", slug)
    .single();

  if (!profile) {
    return { title: "Chef not found" };
  }

  const currentRole = profile.parsed_profile?.current_role ?? "";
  const summary = profile.parsed_profile?.summary ?? "";
  const title = `${profile.name}${currentRole ? ` · ${currentRole}` : ""}`;
  const description = summary || `${profile.name}'s culinary profile on Kitchen Applications.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/chef/${slug}`,
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${SITE_URL}/chef/${slug}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url, alt: profile.name }] : undefined,
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function ChefProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("name, slug, avatar_url, parsed_profile, updated_at")
    .eq("slug", slug)
    .single();

  if (error || !profile) {
    notFound();
  }

  const parsed = profile.parsed_profile;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name ?? slug,
    url: `${SITE_URL}/chef/${slug}`,
    ...(parsed?.current_role && { jobTitle: parsed.current_role }),
    ...(profile.avatar_url && { image: profile.avatar_url }),
    ...(parsed?.summary && { description: parsed.summary }),
    ...(parsed?.skills?.length && { knowsAbout: parsed.skills }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <ChefProfile
        name={profile.name ?? slug}
        avatar_url={profile.avatar_url ?? null}
        profile={parsed ?? null}
      />
    </>
  );
}
