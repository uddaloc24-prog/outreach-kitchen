import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("name, slug, avatar_url, parsed_profile, updated_at")
    .eq("slug", slug)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }

  return NextResponse.json({
    chef: {
      name: profile.name,
      slug: profile.slug,
      avatar_url: profile.avatar_url,
      parsed_profile: profile.parsed_profile
        ? {
            current_role: profile.parsed_profile.current_role,
            summary: profile.parsed_profile.summary,
            experiences: profile.parsed_profile.experiences,
            education: profile.parsed_profile.education,
            skills: profile.parsed_profile.skills,
            languages: profile.parsed_profile.languages,
          }
        : null,
      updated_at: profile.updated_at,
    },
  });
}
