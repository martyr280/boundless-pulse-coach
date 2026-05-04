# Production Readiness Plan

The app currently runs with **public RLS** on every table, no authentication, no per-user data scoping, and no role separation between members and coaches. That's fine for a demo but blocks real-world use. This plan closes those gaps in five focused phases.

## Phase 1 — Authentication & user identity

- Add Lovable Cloud auth (email/password + Google).
- New routes: `/auth` (sign in / sign up / forgot password) and `/reset-password`.
- Create `profiles` table (`id` FK → `auth.users`, `display_name`, `phone_number`, `timezone`, `avatar_url`, `created_at`) with auto-create trigger on signup.
- Create `user_roles` table + `app_role` enum (`member`, `coach`, `admin`) + `has_role(uuid, app_role)` SECURITY DEFINER function. Roles **never** stored on profiles.
- Wrap app in an `AuthProvider` using `onAuthStateChange` (set listener before `getSession`).
- Protected route wrapper redirects unauthenticated users to `/auth`.
- Coach routes (`/coach`) gated by `has_role(auth.uid(), 'coach')`.

## Phase 2 — Per-user data ownership + real RLS

Add `user_id uuid references auth.users(id)` to every user-owned table and replace the `Public *` policies:

- `lci_sessions`, `lci_highs_lows` (via session), `lci_top_tasks` (via session), `action_items`, `action_item_updates` (via action item), `scheduled_lci`, `nudge_preferences` — owner can SELECT/INSERT/UPDATE/DELETE their own rows only.
- `cohort_members`, `cohort_checkins`, `coach_insights`, `coaches` — readable/writable only by the owning coach (`coach_id` joined to `auth.uid()` via `coaches.user_id`).
- `nudge_log` — readable by the row's owner; insert restricted to service role (edge functions).
- Backfill: assign existing demo rows to a seeded demo user, or wipe demo data on migrate (ask user — default: keep demo, attribute to demo user).
- Add the missing **foreign keys** the schema is missing today (`lci_top_tasks.session_id`, `action_items.source_lci_id`, `action_items.source_top_task_id`, `action_item_updates.action_item_id`, `cohort_*` → `coaches`, etc.) with `ON DELETE CASCADE` where appropriate.

## Phase 3 — Edge function hardening

- All edge functions: read `auth.uid()` from the JWT instead of trusting client-supplied `coach_id` / `phone_number`.
- `supabase/config.toml`: set `verify_jwt = true` for `lci-summary`, `coach-analytics`, `boundless-assessment`, `boundless-coach`. Keep `nudge-engine` callable by cron only (service role).
- Replace direct service-role queries that bypass RLS with user-scoped queries where the call originated from a user.
- Add input validation (zod) on every function payload; return 400 on invalid input, 401/403 on auth failures.
- Rate-limit AI endpoints (simple per-user counter table) to prevent credit drain.
- Handle Lovable AI gateway 429 / 402 responses gracefully and surface a friendly toast.

## Phase 4 — Reliability, observability, UX polish

- Wrap every Supabase call site in try/catch with toast errors (today many silently fail).
- Add a global `ErrorBoundary` and a `NotFound`-style fallback for thrown errors.
- Loading skeletons on Pulse, LCI list, Actions, Coach Dashboard (currently blank flicker).
- Empty states with CTAs ("No LCIs yet — start your first").
- Form validation with `react-hook-form` + `zod` on Check-In, LCI New, Nudges prefs.
- Confirm dialogs on destructive actions (delete LCI, delete action item).
- Schedule `nudge-engine` via Supabase cron (`pg_cron`) hourly instead of manual trigger.
- Add `created_by` / `updated_at` columns + triggers where missing.

## Phase 5 — Security review, testing, launch checklist

- Run `supabase--linter` and `security--run_security_scan`; fix all errors and warnings.
- Enable **Leaked Password Protection** (HIBP) in auth config.
- Scrub `coach-analytics` demo seeding behind an admin-only flag (currently any caller can spawn demo data).
- Add Playwright smoke tests: signup → check-in → create LCI → see action item → coach dashboard.
- Add Deno tests for each edge function (auth required, invalid input rejected, happy path).
- Update README with setup, env vars, deploy steps.
- Final pass: remove `console.log`s, confirm no secrets in client bundle, verify Twilio sandbox → production number swap path is documented.

## Out of scope (call out, don't build)

- Multi-tenant org/billing model
- Mobile push notifications (WhatsApp via Twilio remains the channel)
- The Bridge OCR scanner (kept as-is, hidden from primary nav)
- Stripe/Paddle payments (separate request)

## Suggested execution order

1. Phase 1 (auth) — unblocks everything else
2. Phase 2 (RLS + ownership) — same migration batch as Phase 1
3. Phase 3 (edge function auth) — immediately after, since Phase 2 will break unauthenticated function calls
4. Phase 4 (UX/reliability) — iterative
5. Phase 5 (scan + tests + docs) — final gate before publish

I recommend approving Phases 1–3 first as one implementation pass (the security-critical core), then reviewing before Phases 4–5.
