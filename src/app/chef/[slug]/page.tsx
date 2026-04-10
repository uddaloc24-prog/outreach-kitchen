import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { ChefProfile } from "@/components/ChefProfile";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, parsed_profile")
    .eq("slug", slug)
    .single();

  if (!profile) {
    return { title: "Chef not found — Kitchen Applications" };
  }

  const currentRole = profile.parsed_profile?.current_role ?? "";
  const summary = profile.parsed_profile?.summary ?? "";

  return {
    title: `${profile.name}${currentRole ? ` · ${currentRole}` : ""} — Kitchen Applications`,
    description: summary || `${profile.name}'s culinary profile on Kitchen Applications.`,
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

  return (
    <ChefProfile
      name={profile.name ?? slug}
      avatar_url={profile.avatar_url ?? null}
      profile={profile.parsed_profile ?? null}
    />
  );
}
