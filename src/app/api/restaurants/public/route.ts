import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** Public endpoint — no auth required. Returns all restaurants for the directory. */
export async function GET() {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, city, country, stars, restaurant_type, head_chef, cuisine_style, website_url, instagram, world_50_rank")
    .order("stars", { ascending: false })
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurants: data ?? [] });
}
