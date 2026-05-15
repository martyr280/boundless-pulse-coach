
## Goal

Close every gap between the Boundless AI Platform proposal and the current app. Items below are scoped to UI + data + edge functions already supported by the stack — no infrastructure changes.

## Gap Inventory

| # | Gap | Feature area |
|---|---|---|
| G1 | RAG pipeline grounded in Boundless IP (vector store + ingestion) | Guide Data Repository |
| G2 | Admin CMS to push framework updates (vision/year/methodology content) | Guide Data Repository |
| G3 | Evening reflection prompt + 30-Day Cycle tracking | Journaling |
| G4 | Inbound WhatsApp reply → captured into journal | Journaling |
| G5 | AI-led full LCI walk-through (guided session, not free chat) | Coaching |
| G6 | Partner-aware weekly nudges ("partner updated their Top Tasks…") | Coaching |
| G7 | Enterprise / HR aggregated cohort dashboard (anonymized trends) | Coaching |

---

## Phased Plan

### Phase 1 — Daily Loop Completion (G3, G4)
Smallest, highest-frequency wins. Strengthens the daily habit before layering anything new.

**G3 — Evening reflection + 30-Day Cycle**
- Add columns to `user_journal_entries`: `evening_reflection TEXT`, `evening_completed_at TIMESTAMPTZ`, `cycle_day INT`.
- Add `user_cycles` table: `id, user_id, started_on date, ended_on date, target_days int default 30, status text`.
- Trigger to auto-assign `cycle_day` on journal insert based on the user's active cycle.
- `/guide` page: split into **Morning** and **Evening** cards. Evening card unlocks after a configurable hour (user timezone). Shows reflection prompt + completion check.
- New `<CycleProgress>` strip on `/` and `/guide`: "Day 12 of 30 · 9 completed".
- Hook: `useCurrentCycle()`.

**G4 — Inbound WhatsApp capture**
- New edge function `whatsapp-inbound` (Twilio webhook, `verify_jwt = false`).
- Maps `From:` E.164 → `nudge_preferences.phone_number` → `user_id`.
- Looks at the last `nudge_log` entry sent to that user in the past 12h to determine intent (gratitude / habit / step / evening reflection) and writes the body into the matching column on today's `user_journal_entries` (upserted).
- Logs to a new `nudge_inbound_log` table for audit.
- Configure Twilio sandbox webhook URL in Connectors (instructions only — user action).

---

### Phase 2 — AI Coach Depth (G5)
**G5 — AI-led guided LCI**
- New edge function `lci-guided-session` (separate from `boundless-coach`) that runs a state-machine prompt: Highs/Lows → Top Task R/Y/G review → re-run YOUR NOW → Year review → 5 new Top Tasks → "What do you need?".
- Persists incremental state to a new `lci_guided_runs` table (`session_id`, `step`, `payload jsonb`) so a user can resume.
- New route `/lci/guided/:id?` with a stepped chat UI (progress bar across the 6 steps).
- On completion, materializes the run into a real `lci_sessions` + `lci_top_tasks` + `lci_highs_lows` row set — exact same shape as a manual LCI.
- Add "Start guided LCI" CTA on `/lci/new`.

---

### Phase 3 — Partner Nudges (G6)
**G6 — Partner-aware weekly nudges**
- Extend `nudge-engine` with a new job type `partner_weekly`.
- Cron (existing scheduler): every Monday 09:00 user-local, for each accepted partnership, check whether the *other* partner has updated `lci_top_tasks` or logged a `user_weekly_resets` row in the past 7 days. If yes and the recipient hasn't checked in 5+ days, send a templated WhatsApp message.
- Add `nudge_preferences.partner_nudges BOOLEAN DEFAULT true` toggle, surfaced in `/nudges`.

---

### Phase 4 — RAG Pipeline (G1)
Largest block. Splits into ingestion + retrieval.

**G1a — Vector store**
- Migration: enable `pgvector`, create `boundless_documents` (`id, title, source, content text, embedding vector(1536), metadata jsonb`), with HNSW index on `embedding`.
- RLS: read-only to all `authenticated`; write only to `admin` role.

**G1b — Ingestion**
- Edge function `rag-ingest` (admin-only, `getUser` + role check). Accepts `{title, content, source}`, chunks (~800 tokens, 100 overlap), embeds via Lovable AI Gateway (`google/text-embedding-004` or equivalent), inserts rows.
- Bulk script: drop docs into `storage://boundless-corpus`; ingest function pulls and processes.

**G1c — Retrieval wired into AI Coach + LCI summary + Assessment**
- New shared util `_shared/rag.ts` for edge functions: `retrieve(query, k=5)` → top chunks → injected as system context.
- Update `boundless-coach`, `boundless-assessment`, `lci-summary`, and the new `lci-guided-session` to call `retrieve()` and prepend the chunks to the system prompt.

---

### Phase 5 — Admin CMS (G2)
**G2 — Framework content management**
- New route `/admin` (admin role only).
- CRUD UI for: `boundless_documents` (corpus), curated "Year priority templates", "Vision exercises", and AI prompt fragments (new `framework_content` table: `slug, title, body, kind, version, is_active`).
- Surface active framework copy in `/guide` (vision exercise text, year-priority prompts) instead of hard-coded strings — read via a `useFrameworkContent(slug)` hook.
- Versioning: keep prior versions, flip `is_active` atomically.

---

### Phase 6 — Enterprise Cohort Dashboard (G7)
**G7 — Anonymized HR/enterprise view**
- New `organizations` table (`id, name, plan`) and `organization_members` (`org_id, user_id, role`).
- Backfill: link `coaches.organization` text into a real `org_id`.
- New route `/org` (role: `org_admin`, new app_role).
- Edge function `org-analytics` aggregates anonymized data across `organization_members`:
  - Average pillar scores per pillar over 12 weeks.
  - Distribution of LCI Top Task R/Y/G.
  - Engagement: % with weekly reset in last 7 days, % with active 30-Day Cycle.
  - Cohort drift alerts (e.g., Field score down >1.0 over 4 weeks).
- Dashboard UI: 7-pillar trend chart, engagement KPIs, drift-alert feed. Strict aggregation — never expose individual rows.
- Add `org_admin` to `app_role` enum and to `user_roles`.

---

## Cross-Cutting Tasks
- Update `mem://index.md` Memories with new feature files for: guided-LCI, RAG pipeline, evening reflection, partner nudges, org dashboard.
- Add tests in `src/test/` for the cycle-day trigger, partner-nudge eligibility, and RAG retrieval shape.
- Document each new edge function in its own `README.md`.

## Suggested Execution Order
1. **Phase 1** (Daily Loop) — fastest user-visible win, no AI dependencies.
2. **Phase 4** (RAG) — unlocks AI quality everywhere downstream.
3. **Phase 2** (Guided LCI) — depends on Phase 4 for best output.
4. **Phase 3** (Partner Nudges) — small, isolated.
5. **Phase 5** (Admin CMS) — needed to maintain RAG corpus at scale.
6. **Phase 6** (Enterprise Dashboard) — last; requires org model and most data accumulated.

## Out of Scope
- Native mobile apps, payments, marketing site, SSO, formal SOC2 work — none are gaps against the proposal as-scoped.
