# Task Tracker — Interview System

## Active Sprint

### Phase 1: Core Email Capability
- [ ] Create `templates/email_template.md` — define tone, structure, word count
- [ ] Build `scripts/generate_email.py` — LLM-powered personalized email generation
- [ ] Build `scripts/send_email.py` — Gmail API send with OAuth2
- [ ] Test end-to-end: generate + send one email manually

### Phase 2: Pipeline
- [ ] Build `scripts/run_pipeline.py` — orchestrate research → generate → send → log
- [ ] Set up Google Sheet for tracking (columns: Name, Email, Status, Sent At, Reply)
- [ ] Integrate Sheet logging into pipeline

### Phase 3: Target Sourcing
- [ ] Decide: manual CSV import vs automated scraper
- [ ] Build `scripts/scrape_restaurants.py` OR create `data/restaurants.csv` template
- [ ] Import first batch of real restaurant targets

### Phase 4: Research & Personalization
- [ ] Build `scripts/research_restaurant.py`
- [ ] Connect research output → generate_email input

### Phase 5: Reply Tracking
- [ ] Build `scripts/track_replies.py`
- [ ] Add follow-up logic (send follow-up after N days of no reply)

---

## Backlog

- [ ] Modal deployment for scheduled daily runs
- [ ] Blacklist logic (don't email same restaurant twice)
- [ ] Bounce/unsubscribe handling
- [ ] Dashboard (simple Sheets view with color coding)

---

## Completed

<!-- Move items here when done -->

---

## Notes

- Always test with 1-2 emails before bulk sending
- Keep daily send volume under 50 to avoid Gmail flags
