# Phase 1 — Marketplace Foundation: Chef Profiles + Employer Accounts

**Date:** 2026-04-10
**Status:** Approved
**Model:** Chef-first (chefs pay for AI applications, employers get free dashboard)

---

## Overview

Transform Kitchen Applications from a chef-only tool into a two-sided marketplace. Phase 1 closes the loop: chefs send polished applications with profile links, employers see those applications in a dedicated inbox.

### Strategic Context

This is Phase 1 of a 4-phase roadmap:
- **Phase 1 (this spec):** Chef profiles + employer accounts + inbox + verification
- **Phase 2:** Subscription tiers + referral system + placement counter
- **Phase 3:** Employer job posting + seasonal alerts + AI interview prep
- **Phase 4:** Chef score + candidate notes/shortlists + team access

### Success Criteria

- A chef uploads CV -> profile page auto-generated at `/chef/[slug]`
- Profile link included in every outreach email sent via the platform
- An employer signs up, claims their restaurant, sees applications in an inbox
- Employer can mark applications as interested / not a fit / interviewing
- Verified employers get a green badge visible to chefs

---

## 1. Chef Profile Page

### Purpose
Auto-generated public profile page attached to every outreach email. When an employer receives an application, they click through to see a polished, professional page.

### URL Structure
`/chef/[slug]` where slug = kebab-case name + 4-char random suffix (e.g., `/chef/uddaloc-ghosh-a7f3`)

### Data Source
All data from existing `user_profiles.parsed_profile`:
- Name, current role, summary (AI-generated 2-3 sentence culinary identity)
- Experience timeline (role, restaurant, period, highlights)
- Skills, languages, education
- Avatar (Google OAuth picture, or uploaded)

### Page Design
- No auth required to view (employers click a link from email)
- Magazine-style layout, parchment aesthetic matching existing app
- Stars worked at displayed prominently (parsed from experience at known Michelin restaurants)
- "Contact via Kitchen Applications" CTA button: if employer is signed in -> opens their inbox filtered to this chef's application. If not signed in -> redirects to sign-in with `callbackUrl` back to profile. Does not reveal chef's email directly.
- Responsive: works on mobile and desktop

### No Edit UI for v1
Profile auto-updates when chef re-uploads CV. Manual editing deferred to Phase 2+.

### Email Integration
Existing `send_email` MCP tool appends a line to every outreach email:
> View my full profile: kitchenapplications.com/chef/[slug]

---

## 2. Role Picker (New User Onboarding)

### Purpose
New users choose their role on first sign-in. Replaces the current flow where every user defaults to `free_trial`.

### Flow
1. User signs in with Google (existing NextAuth)
2. App checks `user_profiles`:
   - No row exists -> create row with `user_type = 'free_trial'`, `has_chosen_role = false`
   - `has_chosen_role = false` -> redirect to `/onboard` (role picker)
   - `user_type = 'chef'` or `'free_trial'` with `has_chosen_role = true` -> chef experience
   - `user_type = 'employer'` -> employer dashboard
   - `user_type = 'institute'` -> unchanged
3. Role picker page (`/onboard`):
   - Two cards: "I'm a chef looking for work" / "I'm hiring for my kitchen"
   - Chef path -> sets `has_chosen_role = true`, shows OnboardingView -> free trial
   - Employer path -> sets `user_type = 'employer'`, `has_chosen_role = true` -> `/employer/setup`

### Design
- Full-page, centered, same parchment aesthetic
- Two large clickable cards with icons and descriptions
- No way to skip — must choose a role to continue

---

## 3. Employer Setup

### Purpose
After choosing "I'm hiring," employers claim their restaurant and provide basic info.

### Flow (`/employer/setup`)
1. Search for restaurant by name (autocomplete against `restaurants` table)
2. If found -> claim it (sets `restaurants.claimed_by`)
3. If not found -> create new restaurant (name, city, country, cuisine, stars)
4. Enter employer role: Head Chef / HR / Owner / Manager
5. Submit -> creates/updates `user_profiles` with `user_type: 'employer'`, `employer_restaurant_id`, `employer_role`
6. Redirect to `/employer`

### Restaurant Claim Rules
- One employer account per restaurant for v1
- If restaurant already claimed -> show message: "This restaurant has been claimed. Contact support."
- Creating a new restaurant adds it to the `restaurants` table (available for chefs to apply to)

---

## 4. Employer Dashboard (`/employer`)

### Layout
Three areas on one page:

#### 4a. Stats Bar (top)
Simple counters:
- Total applications received
- New this week
- Marked "Interested"
- Interviews scheduled

#### 4b. Application Inbox (main content)
Table/list of all applications sent by chefs to this employer's restaurant:
- Columns: Chef name, current role, stars worked at, date received, status
- Click row -> expands to show:
  - Full email body that was sent
  - Link to chef's profile page (`/chef/[slug]`)
  - Action buttons: "Interested" / "Not a fit" / "Schedule interview"
- Filter by: status (all / new / interested / not_a_fit / interviewing), date range

#### 4c. Restaurant Info Card (sidebar on desktop, top card on mobile)
- Restaurant name, city, country, stars, cuisine style
- Verification status with badge (pending / verified)
- "Edit details" link (basic inline editing)

### Data Source
Query `outreach_log` joined with `user_profiles` where `outreach_log.restaurant_id = employer's restaurant`.

### Empty State
"No applications yet. Chefs are discovering your kitchen — applications will appear here."

---

## 5. Employer Verification Badge

### Purpose
Verified restaurants get a trust badge. Builds credibility for both sides.

### Verification Flow
1. Employer claims restaurant -> status starts as `pending`
2. Admin (you) manually verifies by checking:
   - Employer's Google email domain matches restaurant website
   - Restaurant exists and is legitimate
3. Set `user_profiles.employer_verified = true` and `restaurants.employer_verified = true`
4. Green checkmark badge appears on:
   - Restaurant row in chef-facing list
   - Job listings from this restaurant (Phase 3)
   - Employer dashboard header

### No Self-Serve Verification for v1
Manual admin verification only. Automated verification (domain check, etc.) deferred.

---

## 6. Navigation Updates

### TopBar Changes
- Add role-aware navigation:
  - Chef users see: Restaurant List, Dashboard, Job Board, My Profile
  - Employer users see: Inbox, My Restaurant, Job Board (view only)
- "I'm hiring" CTA button visible to unauthenticated users

### Routing Guard
- Employer users navigating to `/` (restaurant list) -> redirect to `/employer`
- Chef users navigating to `/employer` -> redirect to `/`

---

## 7. Database Migration (012_marketplace_foundation.sql)

```sql
-- Chef profile enhancements
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
CREATE INDEX IF NOT EXISTS idx_outreach_restaurant ON outreach_log(restaurant_id);
```

**Must be run manually in Supabase SQL editor.**

---

## 8. New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/012_marketplace_foundation.sql` | Migration | All schema changes |
| `src/app/chef/[slug]/page.tsx` | Page | Public chef profile |
| `src/app/onboard/page.tsx` | Page | Role picker (chef vs employer) |
| `src/app/employer/page.tsx` | Page | Employer dashboard (inbox + stats) |
| `src/app/employer/setup/page.tsx` | Page | Restaurant claim/onboarding |
| `src/app/api/employer/applications/route.ts` | API | GET applications for employer's restaurant |
| `src/app/api/employer/applications/[id]/route.ts` | API | PATCH employer_status on application |
| `src/app/api/employer/restaurant/route.ts` | API | GET/PATCH employer's restaurant info |
| `src/app/api/chef/[slug]/route.ts` | API | GET public chef profile data |
| `src/components/EmployerDashboard.tsx` | Component | Inbox + stats + restaurant card |
| `src/components/ChefProfile.tsx` | Component | Public profile page layout |
| `src/components/RolePicker.tsx` | Component | Chef vs employer choice |
| `src/components/EmployerSetup.tsx` | Component | Restaurant claim form |
| `src/types/employer.ts` | Types | Employer-specific TypeScript types |

---

## 9. API Routes

### GET `/api/chef/[slug]`
- No auth required
- Returns chef profile data (name, summary, experiences, skills, languages, avatar)
- Does NOT return email, phone, or raw CV text

### GET `/api/employer/applications`
- Auth required, employer only
- Returns outreach_log rows for employer's restaurant, joined with chef user_profiles
- Includes chef slug for profile link

### PATCH `/api/employer/applications/[id]`
- Auth required, employer only
- Updates `employer_status` on outreach_log row
- Body: `{ status: "interested" | "not_a_fit" | "interviewing" }`

### GET/PATCH `/api/employer/restaurant`
- Auth required, employer only
- GET: returns restaurant info
- PATCH: updates editable fields (cuisine_style, careers_email, website_url)

---

## 10. Out of Scope (Deferred)

- Chef profile manual editing UI (Phase 2+)
- Employer job posting (Phase 3)
- Candidate notes and shortlists (Phase 4)
- Team access / multiple employer users per restaurant (Phase 4)
- Chef Score (Phase 4)
- Automated employer verification (future)
- Employer payments (future — currently free)
