# Phase 1 — Marketplace Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Kitchen Applications from a chef-only tool into a two-sided marketplace with public chef profiles and an employer inbox.

**Architecture:** Extend the existing Next.js App Router app with new pages (`/chef/[slug]`, `/onboard`, `/employer`, `/employer/setup`) and API routes. Chef profiles are public (no auth to view). Employer dashboard queries existing `outreach_log` joined with `user_profiles`. All new columns added via migration 012.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres), NextAuth.js v4, existing parchment design system.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/012_marketplace_foundation.sql` | Create | Schema changes: new columns on user_profiles, outreach_log, restaurants |
| `src/types/employer.ts` | Create | Employer-specific TypeScript types |
| `src/types/index.ts` | Modify | Add `export * from "./employer"` |
| `src/lib/slug.ts` | Create | Slug generation utility |
| `src/app/api/chef/[slug]/route.ts` | Create | GET public chef profile (no auth) |
| `src/app/chef/[slug]/page.tsx` | Create | Public chef profile page |
| `src/components/ChefProfile.tsx` | Create | Profile layout component |
| `src/app/onboard/page.tsx` | Create | Role picker (chef vs employer) |
| `src/components/RolePicker.tsx` | Create | Role picker UI component |
| `src/app/employer/page.tsx` | Create | Employer dashboard page |
| `src/components/EmployerDashboard.tsx` | Create | Inbox + stats + restaurant card |
| `src/app/employer/setup/page.tsx` | Create | Employer restaurant claim page |
| `src/components/EmployerSetup.tsx` | Create | Restaurant search + claim form |
| `src/app/api/employer/applications/route.ts` | Create | GET applications for employer's restaurant |
| `src/app/api/employer/applications/[id]/route.ts` | Create | PATCH employer_status on application |
| `src/app/api/employer/restaurant/route.ts` | Create | GET/PATCH employer's restaurant |
| `src/app/api/onboard/route.ts` | Create | POST to set user role |
| `src/app/api/profile/upload/route.ts` | Modify | Generate slug on CV upload |
| `src/lib/tools/send-email.ts` | Modify | Append profile link to emails |
| `src/app/page.tsx` | Modify | Redirect employers to /employer |
| `src/components/TopBar.tsx` | Modify | Role-aware navigation + "I'm hiring" CTA |
| `src/lib/auth.ts` | Modify | Set has_chosen_role=false for new users |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/012_marketplace_foundation.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 012_marketplace_foundation.sql
-- Phase 1: Chef profiles + employer accounts + inbox

-- Chef profile additions
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_chosen_role BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS employer_restaurant_id UUID REFERENCES restaurants(id),
  ADD COLUMN IF NOT EXISTS employer_role TEXT
    CHECK (employer_role IN ('head_chef', 'hr', 'owner', 'manager')),
  ADD COLUMN IF NOT EXISTS employer_verified BOOLEAN DEFAULT FALSE;

-- Update user_type constraint to include 'employer'
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_type_check
  CHECK (user_type IN ('institute', 'chef', 'free_trial', 'employer'));

-- Employer status on applications
ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS employer_status TEXT
    CHECK (employer_status IN ('new', 'interested', 'not_a_fit', 'interviewing'));

-- Restaurant claim tracking
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS claimed_by UUID,
  ADD COLUMN IF NOT EXISTS employer_verified BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_slug ON user_profiles(slug);
-- idx_outreach_restaurant already exists from migration 002

-- Mark existing users as having chosen their role (they're all chefs)
UPDATE user_profiles SET has_chosen_role = TRUE WHERE user_type IS NOT NULL;
```

- [ ] **Step 2: Verify migration syntax**

Read the file back to confirm no typos. This migration must be run manually in Supabase SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_marketplace_foundation.sql
git commit -m "feat: add migration 012 for marketplace foundation (chef profiles + employer accounts)"
```

---

### Task 2: Types + Slug Utility

**Files:**
- Create: `src/types/employer.ts`
- Modify: `src/types/index.ts`
- Create: `src/lib/slug.ts`

- [ ] **Step 1: Create employer types**

```typescript
// src/types/employer.ts

export type EmployerRole = "head_chef" | "hr" | "owner" | "manager";

export type EmployerApplicationStatus = "new" | "interested" | "not_a_fit" | "interviewing";

export interface EmployerApplication {
  id: string;
  restaurant_id: string;
  user_id: string;
  status: string;
  employer_status: EmployerApplicationStatus | null;
  email_subject: string | null;
  email_body: string | null;
  sent_at: string | null;
  created_at: string;
  // Joined chef data
  chef_name: string | null;
  chef_slug: string | null;
  chef_current_role: string | null;
  chef_avatar_url: string | null;
  chef_parsed_profile: import("./index").ParsedProfile | null;
}

export interface EmployerStats {
  total_applications: number;
  new_this_week: number;
  interested: number;
  interviewing: number;
}

export interface EmployerRestaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  cuisine_style: string | null;
  website_url: string | null;
  careers_email: string | null;
  employer_verified: boolean;
}

export type UserRole = "chef" | "employer";
```

- [ ] **Step 2: Export employer types from index**

Add to the bottom of `src/types/index.ts`:

```typescript
export * from "./employer";
```

- [ ] **Step 3: Create slug utility**

```typescript
// src/lib/slug.ts

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/employer.ts src/types/index.ts src/lib/slug.ts
git commit -m "feat: add employer types and slug utility"
```

---

### Task 3: Public Chef Profile API

**Files:**
- Create: `src/app/api/chef/[slug]/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/chef/[slug]/route.ts

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

  // Never expose email, phone, or raw CV text publicly
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chef/[slug]/route.ts
git commit -m "feat: add public chef profile API endpoint"
```

---

### Task 4: Public Chef Profile Page + Component

**Files:**
- Create: `src/components/ChefProfile.tsx`
- Create: `src/app/chef/[slug]/page.tsx`

- [ ] **Step 1: Create ChefProfile component**

```typescript
// src/components/ChefProfile.tsx

"use client";

import type { ParsedProfile } from "@/types";

interface ChefProfileProps {
  name: string;
  avatar_url: string | null;
  profile: {
    current_role: string;
    summary: string;
    experiences: ParsedProfile["experiences"];
    education: string;
    skills: string[];
    languages: string[];
  } | null;
}

export function ChefProfile({ name, avatar_url, profile }: ChefProfileProps) {
  if (!profile) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-muted">This chef hasn't set up their profile yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-8">
        <div className="flex items-start gap-5">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-warm-border"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-warm-border/30 flex items-center justify-center text-[24px] text-muted">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-[28px] sm:text-[36px] font-light text-ink leading-tight">
              {name}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-muted mt-1">
              {profile.current_role}
            </p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-[14px] text-ink mt-8 leading-relaxed max-w-[600px]">
          {profile.summary}
        </p>
      </div>

      {/* Experience */}
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 pb-8">
        <h2 className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4 pt-6 border-t border-warm-border">
          Experience
        </h2>
        <div className="space-y-6">
          {profile.experiences.map((exp, i) => (
            <div key={i} className="flex gap-6">
              <span className="text-[12px] text-muted/60 w-24 shrink-0 pt-0.5">
                {exp.period}
              </span>
              <div>
                <p className="text-[14px] text-ink font-medium">{exp.role}</p>
                <p className="text-[13px] text-muted">{exp.place}</p>
                {exp.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="text-[12px] text-muted leading-relaxed">
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills + Languages + Education */}
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-warm-border">
          {/* Skills */}
          <div>
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-muted mb-3">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span
                  key={s}
                  className="text-[11px] border border-warm-border px-2 py-1 text-ink"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-muted mb-3">
              Languages
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((l) => (
                <span
                  key={l}
                  className="text-[11px] border border-warm-border px-2 py-1 text-ink"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-muted mb-3">
              Education
            </h2>
            <p className="text-[12px] text-muted leading-relaxed">
              {profile.education}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 pb-16">
        <div className="pt-6 border-t border-warm-border text-center">
          <a
            href="/"
            className="inline-block border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Contact via Kitchen Applications
          </a>
          <p className="text-[11px] text-muted mt-3">
            Powered by Kitchen Applications
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

```typescript
// src/app/chef/[slug]/page.tsx

import { createServerSupabase } from "@/lib/supabase-server";
import { ChefProfile } from "@/components/ChefProfile";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("user_profiles")
    .select("name, parsed_profile")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Chef Not Found" };

  const role = data.parsed_profile?.current_role ?? "Chef";
  return {
    title: `${data.name} — ${role} | Kitchen Applications`,
    description: data.parsed_profile?.summary ?? `Chef profile for ${data.name}`,
  };
}

export default async function ChefProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, slug, avatar_url, parsed_profile")
    .eq("slug", slug)
    .single();

  if (!profile) notFound();

  const parsed = profile.parsed_profile
    ? {
        current_role: profile.parsed_profile.current_role ?? "",
        summary: profile.parsed_profile.summary ?? "",
        experiences: profile.parsed_profile.experiences ?? [],
        education: profile.parsed_profile.education ?? "",
        skills: profile.parsed_profile.skills ?? [],
        languages: profile.parsed_profile.languages ?? [],
      }
    : null;

  return (
    <ChefProfile
      name={profile.name ?? "Chef"}
      avatar_url={profile.avatar_url}
      profile={parsed}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ChefProfile.tsx src/app/chef/[slug]/page.tsx
git commit -m "feat: add public chef profile page at /chef/[slug]"
```

---

### Task 5: Generate Slug on CV Upload + Attach to Emails

**Files:**
- Modify: `src/app/api/profile/upload/route.ts`
- Modify: `src/lib/tools/send-email.ts`

- [ ] **Step 1: Add slug generation to profile upload**

In `src/app/api/profile/upload/route.ts`, add import at top:

```typescript
import { generateSlug } from "@/lib/slug";
```

Then modify the upsert block (around line 134) to generate a slug if one doesn't exist:

Replace the existing upsert call:
```typescript
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: session.user.email,
        name: parsed.name || session.user.name || "",
        email: parsed.email || session.user.email,
        phone: parsed.phone || "",
        raw_cv_text: cv_text,
        parsed_profile: parsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
```

With:
```typescript
  // Check if user already has a slug
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("slug")
    .eq("user_id", session.user.email)
    .single();

  const slug = existing?.slug || generateSlug(parsed.name || session.user.name || session.user.email);

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: session.user.email,
        name: parsed.name || session.user.name || "",
        email: parsed.email || session.user.email,
        phone: parsed.phone || "",
        raw_cv_text: cv_text,
        parsed_profile: parsed,
        slug,
        avatar_url: session.user.image || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
```

- [ ] **Step 2: Append profile link to outreach emails**

In `src/lib/tools/send-email.ts`, add slug lookup and append profile link.

After the CV attachment block (around line 40), before `buildRfc2822Email`, add:

```typescript
  // Fetch chef's profile slug to append profile link
  const { data: chefProfile } = await supabase
    .from("user_profiles")
    .select("slug")
    .eq("user_id", user_email)
    .single();

  let bodyWithProfile = body;
  if (chefProfile?.slug) {
    const profileUrl = `${process.env.NEXTAUTH_URL || "https://outreach-kitchen.vercel.app"}/chef/${chefProfile.slug}`;
    bodyWithProfile = `${body}\n\nView my full profile: ${profileUrl}`;
  }
```

Then change the `buildRfc2822Email` call to use `bodyWithProfile` instead of `body`:

```typescript
  const raw = buildRfc2822Email(to_email, subject, bodyWithProfile, senderEmail, attachment);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/profile/upload/route.ts src/lib/tools/send-email.ts
git commit -m "feat: generate slug on CV upload and append profile link to outreach emails"
```

---

### Task 6: Onboard API + Role Picker Page

**Files:**
- Create: `src/app/api/onboard/route.ts`
- Create: `src/components/RolePicker.tsx`
- Create: `src/app/onboard/page.tsx`

- [ ] **Step 1: Create onboard API route**

```typescript
// src/app/api/onboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = (await req.json()) as { role: UserRole };

  if (role !== "chef" && role !== "employer") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const userType = role === "employer" ? "employer" : "free_trial";

  const { error } = await supabase
    .from("user_profiles")
    .update({
      user_type: userType,
      has_chosen_role: true,
    })
    .eq("user_id", session.user.email);

  if (error) {
    return NextResponse.json({ error: "Failed to set role" }, { status: 500 });
  }

  return NextResponse.json({ success: true, user_type: userType });
}
```

- [ ] **Step 2: Create RolePicker component**

```typescript
// src/components/RolePicker.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

export function RolePicker() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChoice(role: UserRole) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to set role");

      if (role === "employer") {
        router.push("/employer/setup");
      } else {
        router.push("/");
      }
    } catch {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4">
          Welcome
        </p>
        <h1 className="font-display text-[28px] sm:text-[42px] font-light text-ink leading-tight">
          How will you use<br />Kitchen Applications?
        </h1>
        <p className="text-[13px] text-muted mt-4 max-w-[440px]">
          Choose your path. You can always change this later.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
          {/* Chef card */}
          <button
            onClick={() => handleChoice("chef")}
            className="text-left border border-warm-border p-6 sm:p-8 hover:border-ink transition-colors group"
          >
            <span className="text-[32px]">&#x1F468;&#x200D;&#x1F373;</span>
            <h2 className="font-display text-[20px] font-light text-ink mt-4">
              I'm a chef
            </h2>
            <p className="text-[13px] text-muted mt-2 leading-relaxed">
              Browse Michelin-starred kitchens, get AI-researched briefs, and send
              personalised applications from your Gmail.
            </p>
            <span className="inline-block mt-4 text-[12px] text-muted group-hover:text-ink transition-colors">
              Start applying &rarr;
            </span>
          </button>

          {/* Employer card */}
          <button
            onClick={() => handleChoice("employer")}
            className="text-left border border-warm-border p-6 sm:p-8 hover:border-ink transition-colors group"
          >
            <span className="text-[32px]">&#x1F3E8;</span>
            <h2 className="font-display text-[20px] font-light text-ink mt-4">
              I'm hiring
            </h2>
            <p className="text-[13px] text-muted mt-2 leading-relaxed">
              Claim your restaurant, receive applications from top culinary talent,
              and manage candidates in one place.
            </p>
            <span className="inline-block mt-4 text-[12px] text-muted group-hover:text-ink transition-colors">
              Set up my kitchen &rarr;
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create onboard page**

```typescript
// src/app/onboard/page.tsx

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RolePicker } from "@/components/RolePicker";
import { Loader2 } from "lucide-react";

export default function OnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/");
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return <RolePicker />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/onboard/route.ts src/components/RolePicker.tsx src/app/onboard/page.tsx
git commit -m "feat: add role picker page at /onboard for new users"
```

---

### Task 7: Employer Setup Page

**Files:**
- Create: `src/components/EmployerSetup.tsx`
- Create: `src/app/employer/setup/page.tsx`
- Create: `src/app/api/employer/restaurant/route.ts`

- [ ] **Step 1: Create employer restaurant API**

```typescript
// src/app/api/employer/restaurant/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

// GET: return employer's restaurant
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id, employer_role, employer_verified")
    .eq("user_id", session.user.email)
    .single();

  if (!profile?.employer_restaurant_id) {
    return NextResponse.json({ restaurant: null });
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, city, country, stars, cuisine_style, website_url, careers_email, employer_verified")
    .eq("id", profile.employer_restaurant_id)
    .single();

  return NextResponse.json({
    restaurant,
    employer_role: profile.employer_role,
    employer_verified: profile.employer_verified,
  });
}

// POST: claim or create restaurant
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { restaurant_id, restaurant_name, city, country, cuisine_style, stars, employer_role } = body;

  const supabase = createServerSupabase();

  let restaurantId = restaurant_id;

  if (restaurant_id) {
    // Claim existing restaurant
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id, claimed_by")
      .eq("id", restaurant_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    if (existing.claimed_by && existing.claimed_by !== session.user.email) {
      return NextResponse.json(
        { error: "This restaurant has already been claimed. Contact support." },
        { status: 409 }
      );
    }

    await supabase
      .from("restaurants")
      .update({ claimed_by: session.user.email })
      .eq("id", restaurant_id);
  } else {
    // Create new restaurant
    if (!restaurant_name || !city || !country) {
      return NextResponse.json({ error: "Name, city, and country are required" }, { status: 400 });
    }

    const { data: newRestaurant, error: createErr } = await supabase
      .from("restaurants")
      .insert({
        name: restaurant_name,
        city,
        country,
        stars: stars ?? 0,
        cuisine_style: cuisine_style || null,
        claimed_by: session.user.email,
      })
      .select("id")
      .single();

    if (createErr) {
      return NextResponse.json({ error: "Failed to create restaurant" }, { status: 500 });
    }
    restaurantId = newRestaurant.id;
  }

  // Link restaurant to employer profile
  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update({
      employer_restaurant_id: restaurantId,
      employer_role: employer_role || "owner",
    })
    .eq("user_id", session.user.email);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, restaurant_id: restaurantId });
}

// PATCH: update restaurant details
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id")
    .eq("user_id", session.user.email)
    .single();

  if (!profile?.employer_restaurant_id) {
    return NextResponse.json({ error: "No restaurant linked" }, { status: 400 });
  }

  const body = await req.json();
  const allowed = ["cuisine_style", "website_url", "careers_email"];
  const updates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { error } = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", profile.employer_restaurant_id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create EmployerSetup component**

```typescript
// src/components/EmployerSetup.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { Restaurant, EmployerRole } from "@/types";

export function EmployerSetup() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [createNew, setCreateNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New restaurant fields
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCuisine, setNewCuisine] = useState("");
  const [newStars, setNewStars] = useState(0);
  const [employerRole, setEmployerRole] = useState<EmployerRole>("owner");

  useEffect(() => {
    if (searchQuery.length < 2) { setRestaurants([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/restaurants");
        if (!res.ok) return;
        const data = await res.json();
        const q = searchQuery.toLowerCase();
        const filtered = (data.restaurants ?? []).filter((r: Restaurant) =>
          r.name.toLowerCase().includes(q)
        );
        setRestaurants(filtered.slice(0, 10));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body = selectedRestaurant
        ? { restaurant_id: selectedRestaurant.id, employer_role: employerRole }
        : {
            restaurant_name: newName,
            city: newCity,
            country: newCountry,
            cuisine_style: newCuisine || null,
            stars: newStars,
            employer_role: employerRole,
          };

      const res = await fetch("/api/employer/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/employer");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-[500px] mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-4">
          Employer Setup
        </p>
        <h1 className="font-display text-[28px] sm:text-[36px] font-light text-ink leading-tight">
          Claim your kitchen
        </h1>
        <p className="text-[13px] text-muted mt-3 max-w-[400px]">
          Search for your restaurant below, or add it if it's not listed yet.
        </p>

        {/* Search */}
        {!createNew && !selectedRestaurant && (
          <div className="mt-8">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 mt-3">
                <Loader2 size={12} className="animate-spin text-muted" />
                <span className="text-[12px] text-muted">Searching...</span>
              </div>
            )}

            {restaurants.length > 0 && (
              <div className="mt-2 border border-warm-border divide-y divide-warm-border/50">
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRestaurant(r)}
                    className="w-full text-left px-4 py-3 hover:bg-warm-border/10 transition-colors"
                  >
                    <p className="text-[13px] text-ink">{r.name}</p>
                    <p className="text-[11px] text-muted">
                      {r.city}, {r.country} · {"★".repeat(r.stars)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !loading && restaurants.length === 0 && (
              <p className="text-[12px] text-muted mt-3">
                No restaurants found.{" "}
                <button
                  onClick={() => { setCreateNew(true); setNewName(searchQuery); }}
                  className="text-ink underline"
                >
                  Add yours
                </button>
              </p>
            )}

            <button
              onClick={() => setCreateNew(true)}
              className="mt-4 text-[12px] text-muted hover:text-ink transition-colors"
            >
              My restaurant isn't listed &rarr;
            </button>
          </div>
        )}

        {/* Selected restaurant */}
        {selectedRestaurant && (
          <div className="mt-8 border border-warm-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] text-ink font-medium">{selectedRestaurant.name}</p>
                <p className="text-[12px] text-muted">
                  {selectedRestaurant.city}, {selectedRestaurant.country} · {"★".repeat(selectedRestaurant.stars)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="text-[11px] text-muted hover:text-ink"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Create new form */}
        {createNew && (
          <div className="mt-8 space-y-4">
            <input
              type="text" placeholder="Restaurant name *" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text" placeholder="City *" value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
              />
              <input
                type="text" placeholder="Country *" value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
              />
            </div>
            <input
              type="text" placeholder="Cuisine style" value={newCuisine}
              onChange={(e) => setNewCuisine(e.target.value)}
              className="w-full px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
            />
            <select
              value={newStars}
              onChange={(e) => setNewStars(parseInt(e.target.value))}
              className="w-full px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
            >
              <option value={0}>No Michelin stars</option>
              <option value={1}>★ One star</option>
              <option value={2}>★★ Two stars</option>
              <option value={3}>★★★ Three stars</option>
            </select>
            <button
              onClick={() => { setCreateNew(false); setSearchQuery(""); }}
              className="text-[12px] text-muted hover:text-ink"
            >
              &larr; Back to search
            </button>
          </div>
        )}

        {/* Role picker */}
        {(selectedRestaurant || createNew) && (
          <div className="mt-6">
            <label className="text-[11px] tracking-[0.15em] uppercase text-muted block mb-2">
              Your role
            </label>
            <select
              value={employerRole}
              onChange={(e) => setEmployerRole(e.target.value as EmployerRole)}
              className="w-full px-4 py-3 text-[13px] border border-warm-border bg-parchment text-ink focus:outline-none focus:border-ink"
            >
              <option value="owner">Owner</option>
              <option value="head_chef">Head Chef</option>
              <option value="hr">HR / Recruitment</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        )}

        {/* Submit */}
        {(selectedRestaurant || createNew) && (
          <div className="mt-8">
            {error && (
              <p className="text-[12px] text-red-600 mb-3">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || (createNew && (!newName || !newCity || !newCountry))}
              className="w-full border border-ink px-8 py-3 text-[13px] tracking-wide text-ink hover:bg-ink hover:text-parchment transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Setting up..." : "Complete setup"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create employer setup page**

```typescript
// src/app/employer/setup/page.tsx

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmployerSetup } from "@/components/EmployerSetup";
import { Loader2 } from "lucide-react";

export default function EmployerSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/");
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return <EmployerSetup />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/employer/restaurant/route.ts src/components/EmployerSetup.tsx src/app/employer/setup/page.tsx
git commit -m "feat: add employer setup page with restaurant claim flow"
```

---

### Task 8: Employer Dashboard (Inbox + Stats)

**Files:**
- Create: `src/app/api/employer/applications/route.ts`
- Create: `src/app/api/employer/applications/[id]/route.ts`
- Create: `src/components/EmployerDashboard.tsx`
- Create: `src/app/employer/page.tsx`

- [ ] **Step 1: Create applications API (GET)**

```typescript
// src/app/api/employer/applications/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Get employer's restaurant
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id, user_type")
    .eq("user_id", session.user.email)
    .single();

  if (!profile || profile.user_type !== "employer" || !profile.employer_restaurant_id) {
    return NextResponse.json({ error: "Not an employer or no restaurant linked" }, { status: 403 });
  }

  // Get all outreach logs for this restaurant with chef info
  const { data: logs, error } = await supabase
    .from("outreach_log")
    .select("id, restaurant_id, user_id, status, employer_status, email_subject, email_body, sent_at, created_at")
    .eq("restaurant_id", profile.employer_restaurant_id)
    .in("status", ["sent", "replied", "followup_due"])
    .order("sent_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch chef profiles for each application
  const chefEmails = [...new Set((logs ?? []).map((l) => l.user_id))];
  const { data: chefs } = await supabase
    .from("user_profiles")
    .select("user_id, name, slug, avatar_url, parsed_profile")
    .in("user_id", chefEmails.length > 0 ? chefEmails : ["__none__"]);

  const chefMap = new Map((chefs ?? []).map((c) => [c.user_id, c]));

  const applications = (logs ?? []).map((log) => {
    const chef = chefMap.get(log.user_id);
    return {
      ...log,
      chef_name: chef?.name ?? null,
      chef_slug: chef?.slug ?? null,
      chef_avatar_url: chef?.avatar_url ?? null,
      chef_current_role: chef?.parsed_profile?.current_role ?? null,
      chef_parsed_profile: chef?.parsed_profile ?? null,
    };
  });

  // Compute stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const stats = {
    total_applications: applications.length,
    new_this_week: applications.filter((a) => a.sent_at && new Date(a.sent_at) > weekAgo).length,
    interested: applications.filter((a) => a.employer_status === "interested").length,
    interviewing: applications.filter((a) => a.employer_status === "interviewing").length,
  };

  return NextResponse.json({ applications, stats });
}
```

- [ ] **Step 2: Create application status update API (PATCH)**

```typescript
// src/app/api/employer/applications/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { EmployerApplicationStatus } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = (await req.json()) as { status: EmployerApplicationStatus };
  const validStatuses: EmployerApplicationStatus[] = ["new", "interested", "not_a_fit", "interviewing"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Verify employer owns the restaurant this application was sent to
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("employer_restaurant_id")
    .eq("user_id", session.user.email)
    .single();

  const { data: log } = await supabase
    .from("outreach_log")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (!profile || !log || profile.employer_restaurant_id !== log.restaurant_id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("outreach_log")
    .update({ employer_status: status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create EmployerDashboard component**

```typescript
// src/components/EmployerDashboard.tsx

"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Calendar, ExternalLink } from "lucide-react";
import type { EmployerApplication, EmployerStats, EmployerRestaurant, EmployerApplicationStatus } from "@/types";

export function EmployerDashboard() {
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [stats, setStats] = useState<EmployerStats | null>(null);
  const [restaurant, setRestaurant] = useState<EmployerRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([fetchApplications(), fetchRestaurant()]).finally(() => setLoading(false));
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch("/api/employer/applications");
      if (!res.ok) return;
      const data = await res.json();
      setApplications(data.applications ?? []);
      setStats(data.stats ?? null);
    } catch {
      // ignore
    }
  }

  async function fetchRestaurant() {
    try {
      const res = await fetch("/api/employer/restaurant");
      if (!res.ok) return;
      const data = await res.json();
      setRestaurant(data.restaurant ?? null);
    } catch {
      // ignore
    }
  }

  async function updateStatus(applicationId: string, status: EmployerApplicationStatus) {
    try {
      const res = await fetch(`/api/employer/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, employer_status: status } : a))
      );
    } catch {
      // ignore
    }
  }

  const filtered = statusFilter === "all"
    ? applications
    : applications.filter((a) => a.employer_status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 sm:px-8 py-6 border-b border-warm-border">
          {[
            { label: "Total", value: stats.total_applications },
            { label: "New this week", value: stats.new_this_week },
            { label: "Interested", value: stats.interested },
            { label: "Interviewing", value: stats.interviewing },
          ].map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="text-[24px] sm:text-[28px] font-display font-light text-ink">{s.value}</p>
              <p className="text-[11px] tracking-[0.15em] uppercase text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Restaurant card */}
      {restaurant && (
        <div className="mx-4 sm:mx-8 mt-6 border border-warm-border p-4 sm:p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[18px] font-light text-ink">{restaurant.name}</h2>
              {restaurant.employer_verified && (
                <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Verified</span>
              )}
            </div>
            <p className="text-[12px] text-muted mt-1">
              {restaurant.city}, {restaurant.country} · {"★".repeat(restaurant.stars)}
              {restaurant.cuisine_style && ` · ${restaurant.cuisine_style}`}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-[12px] border border-warm-border bg-parchment text-ink px-3 py-2 focus:outline-none focus:border-ink"
        >
          <option value="all">All applications</option>
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="not_a_fit">Not a fit</option>
          <option value="interviewing">Interviewing</option>
        </select>
        <span className="text-[12px] text-muted">
          {filtered.length} application{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Applications list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="font-display text-[24px] font-light italic text-muted">
            No applications yet
          </p>
          <p className="text-[13px] text-muted mt-2 max-w-md">
            Chefs are discovering your kitchen — applications will appear here when they apply.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-warm-border/50">
          {filtered.map((app) => (
            <div key={app.id} className="px-4 sm:px-8">
              {/* Row */}
              <button
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                className="w-full text-left py-4 flex items-center gap-4"
              >
                {app.chef_avatar_url ? (
                  <img src={app.chef_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-warm-border shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-warm-border/30 flex items-center justify-center text-[14px] text-muted shrink-0">
                    {(app.chef_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink truncate">{app.chef_name ?? "Unknown Chef"}</p>
                  <p className="text-[12px] text-muted truncate">{app.chef_current_role ?? "Chef"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted">
                    {app.sent_at ? new Date(app.sent_at).toLocaleDateString() : "—"}
                  </p>
                  {app.employer_status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                      app.employer_status === "interested" ? "bg-green-100 text-green-800" :
                      app.employer_status === "interviewing" ? "bg-blue-100 text-blue-800" :
                      app.employer_status === "not_a_fit" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {app.employer_status.replace("_", " ")}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === app.id && (
                <div className="pb-6 pl-14">
                  {/* Email body */}
                  {app.email_body && (
                    <div className="bg-white/50 border border-warm-border p-4 text-[13px] text-ink leading-relaxed whitespace-pre-wrap mb-4">
                      {app.email_body}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => updateStatus(app.id, "interested")}
                      className="flex items-center gap-1.5 text-[12px] border border-green-300 text-green-700 px-3 py-2 hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle size={12} /> Interested
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, "not_a_fit")}
                      className="flex items-center gap-1.5 text-[12px] border border-red-300 text-red-600 px-3 py-2 hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={12} /> Not a fit
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, "interviewing")}
                      className="flex items-center gap-1.5 text-[12px] border border-blue-300 text-blue-600 px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <Calendar size={12} /> Schedule interview
                    </button>
                    {app.chef_slug && (
                      <a
                        href={`/chef/${app.chef_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12px] border border-warm-border text-ink px-3 py-2 hover:border-ink transition-colors"
                      >
                        <ExternalLink size={12} /> View profile
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create employer dashboard page**

```typescript
// src/app/employer/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { Loader2 } from "lucide-react";

export default function EmployerPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) { setChecking(false); return; }

    // Verify this user is actually an employer with a restaurant
    fetch("/api/employer/restaurant")
      .then((res) => res.json())
      .then((data) => {
        if (!data.restaurant) {
          router.push("/employer/setup");
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [authStatus, session, router]);

  if (authStatus === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-parchment">
        <TopBar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
          <h1 className="font-display text-display text-ink">Employer Dashboard</h1>
          <p className="text-body text-muted mt-4 max-w-md">
            Sign in to manage applications and candidates for your kitchen.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/employer" })}
            className="mt-8 border border-ink px-8 py-3 text-body text-ink hover:bg-ink hover:text-parchment transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      {/* Page header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 border-b border-warm-border">
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Employer</p>
        <h1 className="font-display text-[24px] sm:text-[36px] font-light text-ink leading-tight">
          Inbox
        </h1>
        <p className="text-[12px] sm:text-[13px] text-muted mt-2 max-w-lg">
          Applications from chefs who want to work in your kitchen.
        </p>
      </div>

      <EmployerDashboard />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/employer/applications/route.ts src/app/api/employer/applications/[id]/route.ts src/components/EmployerDashboard.tsx src/app/employer/page.tsx
git commit -m "feat: add employer dashboard with application inbox and status management"
```

---

### Task 9: Update Auth + Routing + TopBar

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Update auth to set has_chosen_role=false for new users**

In `src/lib/auth.ts`, modify the free trial upsert (around line 56):

Replace:
```typescript
        await supabase.from("user_profiles").upsert(
          { user_id: user.email, user_type: "free_trial", applications_remaining: 1 },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
```

With:
```typescript
        await supabase.from("user_profiles").upsert(
          { user_id: user.email, user_type: "free_trial", applications_remaining: 1, has_chosen_role: false },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
```

- [ ] **Step 2: Update home page to route employers and new users**

In `src/app/page.tsx`, modify the `checkProfile` function. Replace the existing function:

```typescript
  async function checkProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      const profile = data.profile ?? null;
      setUserProfile(profile);

      // Employer → redirect to employer dashboard
      if (profile?.user_type === "employer") {
        window.location.href = "/employer";
        return;
      }

      // New user who hasn't chosen a role → redirect to onboard
      if (profile && !profile.has_chosen_role) {
        window.location.href = "/onboard";
        return;
      }

      if (profile?.user_type === "free_trial") {
        if (!sessionStorage.getItem("onboarding_complete")) {
          setShowOnboarding(true);
        } else if (!sessionStorage.getItem("free_trial_dismissed")) {
          setShowFreeTrial(true);
        }
      }
    } catch {
      setUserProfile(null);
    }
  }
```

- [ ] **Step 3: Update TopBar with role-aware navigation**

Replace the `navLinks` array in `src/components/TopBar.tsx`:

```typescript
  const navLinks = [
    { href: "/", label: "Restaurant List", chefOnly: true },
    { href: "/dashboard", label: "Dashboard", chefOnly: true },
    { href: "/employer", label: "Inbox", employerOnly: true },
    { href: "/jobs", label: "Job Board", authOnly: true },
    { href: "/profile", label: "My Profile", chefOnly: true },
    { href: "/pricing", label: "Pricing", unauthOnly: true },
  ];
```

Update the filtering logic to handle the new flags. First, add a state for user type:

```typescript
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserType(d.profile?.user_type ?? null))
      .catch(() => {});
  }, [session]);
```

Then update the filter:

```typescript
  const visibleLinks = navLinks.filter((l) => {
    if (l.authOnly && !session) return false;
    if (l.unauthOnly && session) return false;
    if ((l as any).chefOnly && (!session || userType === "employer")) return false;
    if ((l as any).employerOnly && (!session || (userType !== "employer"))) return false;
    return true;
  });
```

Add the "I'm hiring" CTA for unauthenticated users, in the desktop nav section after the sign-in button:

After the existing sign-in button in desktop nav, the whole auth block becomes:
```typescript
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut()}
              className="text-[13px] text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="text-[13px] border border-warm-border px-4 py-2 text-ink hover:border-ink transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => signIn("google", { callbackUrl: "/onboard" })}
                className="text-[13px] border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-parchment transition-colors"
              >
                I'm hiring
              </button>
            </div>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/page.tsx src/components/TopBar.tsx
git commit -m "feat: add role-aware routing and navigation for chef vs employer users"
```

---

### Task 10: Build Verification + Deploy

- [ ] **Step 1: Run build**

```bash
cd "c:/Users/uddal/OneDrive/Desktop/Interview system" && npx next build
```

Expected: Clean build with no TypeScript errors. New routes should appear:
- `/chef/[slug]` (dynamic)
- `/onboard` (static)
- `/employer` (static)
- `/employer/setup` (static)
- `/api/chef/[slug]` (dynamic)
- `/api/onboard` (dynamic)
- `/api/employer/applications` (dynamic)
- `/api/employer/applications/[id]` (dynamic)
- `/api/employer/restaurant` (dynamic)

- [ ] **Step 2: Fix any build errors**

If TypeScript errors occur, fix them. Common issues:
- Missing type imports
- `params` not being awaited (Next.js 15 requires `await params`)
- Supabase column types not matching

- [ ] **Step 3: Deploy to Vercel**

```bash
cd "c:/Users/uddal/OneDrive/Desktop/Interview system" && npx vercel --prod --yes
```

- [ ] **Step 4: Commit any build fixes**

```bash
git add -A
git commit -m "fix: resolve build errors for marketplace foundation"
```

---

## Post-Deployment Checklist

After deploying and running migration 012 in Supabase SQL editor:

1. Sign out → sign back in → should see role picker at `/onboard`
2. Choose "I'm a chef" → normal chef flow
3. Sign out → sign in with different account → choose "I'm hiring" → employer setup
4. Claim a restaurant → lands on employer inbox (empty)
5. From chef account, send an application to that restaurant → appears in employer inbox
6. Click application → see email body + chef profile link
7. Mark as "Interested" → status updates
8. Visit `/chef/[slug]` → public profile page loads without auth
