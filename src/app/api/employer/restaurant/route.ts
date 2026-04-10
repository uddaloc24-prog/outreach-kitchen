import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { EmployerRole } from "@/types";

// ── GET — fetch employer's linked restaurant ──────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id, employer_role, employer_verified")
    .eq("user_id", session.user.email)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ restaurant: null });
  }

  if (!profile.employer_restaurant_id) {
    return NextResponse.json({ restaurant: null });
  }

  const { data: restaurant, error: restaurantErr } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", profile.employer_restaurant_id)
    .single();

  if (restaurantErr || !restaurant) {
    return NextResponse.json({ restaurant: null });
  }

  return NextResponse.json({
    restaurant: {
      ...restaurant,
      employer_role: profile.employer_role,
      employer_verified: profile.employer_verified ?? false,
    },
  });
}

// ── POST — claim or create restaurant ────────────────────────────────────────

interface ClaimExistingBody {
  restaurant_id: string;
  employer_role: EmployerRole;
}

interface CreateNewBody {
  restaurant_name: string;
  city: string;
  country: string;
  cuisine_style?: string;
  stars?: number;
  employer_role: EmployerRole;
}

type PostBody = ClaimExistingBody | CreateNewBody;

function isClaimBody(b: PostBody): b is ClaimExistingBody {
  return "restaurant_id" in b;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { employer_role } = body;
  if (!["head_chef", "hr", "owner", "manager"].includes(employer_role)) {
    return NextResponse.json({ error: "Invalid employer_role" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  let restaurant_id: string;

  if (isClaimBody(body)) {
    // Claim existing restaurant
    const { data: existing, error: fetchErr } = await supabase
      .from("restaurants")
      .select("id, claimed_by")
      .eq("id", body.restaurant_id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (existing.claimed_by && existing.claimed_by !== session.user.email) {
      return NextResponse.json(
        { error: "This restaurant has already been claimed by another account" },
        { status: 409 }
      );
    }

    const { error: claimErr } = await supabase
      .from("restaurants")
      .update({ claimed_by: session.user.email })
      .eq("id", body.restaurant_id);

    if (claimErr) {
      return NextResponse.json({ error: claimErr.message }, { status: 500 });
    }

    restaurant_id = body.restaurant_id;
  } else {
    // Create new restaurant
    if (!body.restaurant_name?.trim() || !body.city?.trim() || !body.country?.trim()) {
      return NextResponse.json(
        { error: "restaurant_name, city, and country are required" },
        { status: 400 }
      );
    }

    const { data: created, error: createErr } = await supabase
      .from("restaurants")
      .insert({
        name: body.restaurant_name.trim(),
        city: body.city.trim(),
        country: body.country.trim(),
        cuisine_style: body.cuisine_style ?? null,
        stars: body.stars ?? 0,
        claimed_by: session.user.email,
      })
      .select("id")
      .single();

    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message ?? "Failed to create restaurant" },
        { status: 500 }
      );
    }

    restaurant_id = created.id;
  }

  // Link to user profile
  const { error: profileErr } = await supabase
    .from("user_profiles")
    .update({ employer_restaurant_id: restaurant_id, employer_role })
    .eq("user_id", session.user.email);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, restaurant_id });
}

// ── PATCH — update restaurant details ────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cuisine_style?: string; website_url?: string; careers_email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Get the employer's linked restaurant
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id")
    .eq("user_id", session.user.email)
    .single();

  if (profileErr || !profile?.employer_restaurant_id) {
    return NextResponse.json({ error: "No restaurant linked to this account" }, { status: 403 });
  }

  // Only allow updating specific fields
  const allowedUpdates: Record<string, string | undefined> = {};
  if (body.cuisine_style !== undefined) allowedUpdates.cuisine_style = body.cuisine_style;
  if (body.website_url !== undefined) allowedUpdates.website_url = body.website_url;
  if (body.careers_email !== undefined) allowedUpdates.careers_email = body.careers_email;

  if (Object.keys(allowedUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("restaurants")
    .update(allowedUpdates)
    .eq("id", profile.employer_restaurant_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
