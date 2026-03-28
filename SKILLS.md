# Skills Reference — Interview System

Skills are self-contained capabilities. Each maps to one or more scripts in `scripts/`.

---

## Active Skills

### `scrape-restaurants`
**Purpose:** Build a list of restaurant targets with name, email, address, cuisine type.
**Script:** `scripts/scrape_restaurants.py`
**Inputs:** City name, cuisine filter (optional), max results
**Outputs:** `data/restaurants.csv` or appends to Google Sheet
**Status:** Not built yet

---

### `research-restaurant`
**Purpose:** Look up a specific restaurant (Google, Yelp, website) to gather details for email personalization.
**Script:** `scripts/research_restaurant.py`
**Inputs:** Restaurant name + city
**Outputs:** Dict of facts: cuisine, vibe, notable dishes, recent reviews
**Status:** Not built yet

---

### `generate-email`
**Purpose:** Use Claude to generate a personalized interview request email based on restaurant research.
**Script:** `scripts/generate_email.py`
**Inputs:** Restaurant data dict, sender profile (name, role, experience)
**Outputs:** Email subject + body as text
**Notes:**
- Must feel human, not templated
- Reference something specific about the restaurant
- Keep under 200 words
- Professional but warm tone
**Status:** Not built yet

---

### `send-email`
**Purpose:** Send an email via Gmail API using OAuth2.
**Script:** `scripts/send_email.py`
**Inputs:** To address, subject, body, optional CC
**Outputs:** Message ID, send status
**Notes:**
- Requires `credentials.json` + `token.json`
- First run triggers OAuth browser flow
- Max ~500 emails/day (Gmail limit), target 50/day to be safe
**Status:** Not built yet

---

### `track-replies`
**Purpose:** Scan Gmail inbox for replies from restaurant contacts.
**Script:** `scripts/track_replies.py`
**Inputs:** List of sent email threads (message IDs)
**Outputs:** Updated status per restaurant (replied / no reply / bounced)
**Status:** Not built yet

---

### `run-pipeline`
**Purpose:** End-to-end orchestrator — research → generate → send → log.
**Script:** `scripts/run_pipeline.py`
**Inputs:** Restaurant CSV or Sheet ID
**Outputs:** Sends emails, updates tracking sheet with status
**Status:** Not built yet

---

## Skill Build Order

1. `generate-email` + `send-email` — core capability, build first
2. `run-pipeline` — wires them together
3. `scrape-restaurants` — feed the pipeline with targets
4. `research-restaurant` — add personalization
5. `track-replies` — close the loop

---

## Notes

- All scripts are callable standalone AND imported by `run_pipeline.py`
- Each script logs errors to stdout and handles them gracefully
- Never crash silently — always surface errors with context
