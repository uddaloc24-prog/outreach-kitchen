# Restaurant Outreach Machine — Agent Instructions

> Mirrored across CLAUDE.md, AGENTS.md for any AI environment.

## Project Overview

**Purpose:** Automated outreach system for Uddaloc Ghosh to apply to Michelin-starred kitchens worldwide.

**Core Flow:**
1. Browse 40 pre-loaded restaurants in the Next.js UI
2. Click → triggers research pipeline (website scrape + Claude brief generation)
3. Review 3-part research brief (kitchen identity, who they hire, your fit)
4. Generate personalised 150–180 word cover email via Claude
5. Edit and send via Gmail OAuth
6. Dashboard tracks replies; auto-generates follow-ups at 21 days

---

## Tech Stack

- **Web App:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui components
- **MCP Server:** TypeScript, @modelcontextprotocol/sdk, Streamable HTTP (port 3001)
- **Database:** Supabase (Postgres) — restaurants + outreach_log + user_tokens
- **Auth:** NextAuth.js v4 (Google OAuth with Gmail scopes)
- **Email:** Gmail API via OAuth2 (tokens stored in Supabase)
- **Scraping:** Firecrawl API (fallback: Cheerio)
- **AI:** Anthropic claude-sonnet-4-6

---

## Project Structure

```
Interview system/          ← Next.js app root
├── src/
│   ├── app/
│   │   ├── page.tsx               Screen 1 (Restaurant List)
│   │   ├── dashboard/page.tsx     Screen 4 (Dashboard)
│   │   └── api/                   API routes → call MCP server
│   ├── components/
│   │   ├── ResearchPanel.tsx      Screen 2 (Research Brief drawer)
│   │   ├── EmailDraft.tsx         Screen 3 (Email Draft + Send)
│   │   ├── RestaurantTable.tsx
│   │   ├── FilterBar.tsx
│   │   ├── TopBar.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── FollowUpQueue.tsx
│   │   └── ui/                    shadcn/ui primitives
│   ├── lib/
│   │   ├── mcp-client.ts          HTTP client → MCP server
│   │   ├── auth.ts                NextAuth config
│   │   ├── supabase.ts            Browser client
│   │   └── supabase-server.ts     Server client (service role)
│   └── types/
│       └── index.ts               All TypeScript types
├── supabase/
│   ├── migrations/                001, 002, 003 SQL
│   └── seed.sql                   40 restaurants
├── mcp-server/
│   ├── src/
│   │   ├── index.ts               Express + MCP server entry point
│   │   ├── tools/                 6 MCP tools
│   │   └── lib/                   supabase, gmail, anthropic helpers
│   └── package.json
├── .env.example                   All required env vars
├── README.md
└── CLAUDE.md                      This file
```

---

## What's Been Built

- [x] Project scaffolding (Next.js + MCP server + Supabase migrations)
- [x] Screen 1 — Restaurant List (table, filters, status badges)
- [x] Screen 2 — Research Panel (drawer, progress indicator, 3-card brief)
- [x] Screen 3 — Email Draft (editable, word count, send + confirm modal)
- [x] Screen 4 — Dashboard (stats, follow-up queue, outreach log)
- [x] MCP Tool 1 — research_restaurant (Firecrawl + Cheerio fallback)
- [x] MCP Tool 2 — generate_research_brief (Claude claude-sonnet-4-6)
- [x] MCP Tool 3 — generate_email (150–180 words, exact rules)
- [x] MCP Tool 4 — send_email (Gmail API + Supabase log)
- [x] MCP Tool 5 — check_replies (poll threads, detect replies/followups)
- [x] MCP Tool 6 — generate_followup (80 words, 21-day trigger)
- [x] 40 restaurants seeded (Copenhagen, Spain, London, Paris, Italy, Nordics, USA, Tokyo)
- [x] Gmail OAuth flow + token storage in Supabase
- [x] NextAuth JWT + token refresh middleware

---

## What's Next

- [ ] Run `npm install` in root + `mcp-server/`
- [ ] Configure Supabase: run 3 migrations + seed
- [ ] Configure Google Cloud: enable Gmail API, create OAuth credentials
- [ ] Fill in `.env.local` and `mcp-server/.env`
- [ ] First test: sign in → click one restaurant → research → generate → send

---

## Known Patterns & Decisions

- All API tokens are server-side only (never exposed to browser)
- Gmail tokens stored in `user_tokens` table (service role access only)
- RLS enabled on all tables; service role bypasses for API routes + MCP server
- MCP server shared secret validates all requests from Next.js
- Firecrawl scrapes if API key is set; falls back to Cheerio automatically
- Email word count validated in UI (150–180 range); Claude is instructed to stay in range
- Emails are never sent without user confirmation (confirm modal + Cmd+Enter)
- Follow-up queue populated when `check_replies` runs (call via Dashboard sync button)
- One `outreach_log` row per restaurant (UNIQUE constraint on restaurant_id)

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-03-27 | Full project built: Next.js app, MCP server (6 tools), 4 screens, 40 restaurants, all migrations |
