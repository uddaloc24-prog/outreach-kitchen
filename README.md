# Restaurant Outreach Machine
### Kitchen Applications — Uddaloc Ghosh

A full-stack outreach system for applying to Michelin-starred kitchens. Combines a Next.js web app, an MCP server with AI tools, Gmail OAuth, and Supabase.

---

## Step 1 — Clone and install

```bash
# Web app dependencies
npm install

# MCP server dependencies
cd mcp-server && npm install
cd ..
```

---

## Step 2 — Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run each migration in order:
   - `supabase/migrations/001_restaurants.sql`
   - `supabase/migrations/002_outreach_log.sql`
   - `supabase/migrations/003_user_tokens.sql`
   - `supabase/seed.sql` (inserts 40 restaurants)
3. Copy your project URL and keys into `.env.local`

---

## Step 3 — Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable **Gmail API**
3. Go to **Credentials** → **Create OAuth 2.0 Client ID** (type: Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret into `.env.local`

---

## Step 4 — Add API keys

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. Required fields:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate

Copy `.env.example` to `mcp-server/.env` and fill in the same values.

---

## Step 5 — Run

```bash
# Terminal 1: MCP server (port 3001)
npm run mcp

# Terminal 2: Next.js app (port 3000)
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign in with Google, and start applying.

---

## Architecture

```
localhost:3000  —  Next.js web app (4 screens)
localhost:3001  —  MCP server (6 tools)

Next.js API routes → POST /mcp → MCP server tools
MCP server tools → Anthropic API (research + email gen)
MCP server tools → Gmail API (send + check replies)
MCP server tools ↔ Supabase (read/write outreach data)
```

## Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Restaurant List | `/` | Browse 40 restaurants, filter, click to research |
| Research Panel | Drawer | Scrape website, generate 3-part brief |
| Email Draft | Same drawer | Review, edit, send cover email via Gmail |
| Dashboard | `/dashboard` | Stats, follow-up queue, full outreach log |

## MCP Tools

| Tool | What it does |
|------|-------------|
| `research_restaurant` | Scrapes website (Firecrawl → Cheerio fallback) |
| `generate_research_brief` | 3-part Claude analysis: identity, hiring, your fit |
| `generate_email` | 150–180 word personalised cover email |
| `send_email` | Gmail API send + logs to Supabase |
| `check_replies` | Polls Gmail threads, detects replies, triggers follow-ups |
| `generate_followup` | 80-word follow-up after 21 days of silence |
