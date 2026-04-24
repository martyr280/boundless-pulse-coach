
# Align app with Boundless methodology (Your Now + LCI + Action Items)

The uploaded PDFs reveal the customer's actual coaching system. Three deltas vs. what's currently built:

1. **Pillar names are wrong.** Real system uses **8 F's** ("(Y)our Now"): Family, Finance, Faith, Fitness, **Friends**, Fun, **Field**. Current app has 7 and uses "Faculty" + "Freedom" instead of "Friends" + "Field". Each pillar also has **sub-topics** (e.g., Family → Spouses, Parents, Children, Intimacy, Conflict Management).
2. **No LCI (Life Check-In) module.** The LCI Worksheet is the customer's core recurring artifact: Highs/Lows (personal & business), Top Tasks review (R/Y/G), 5 new Top Tasks, "What can I help you with?".
3. **No Action Items tracker.** The 04/03 doc shows the customer's followup style: dated action items with status notes ("Completed 04/14", "Awaiting response", "Slated to complete by 05/07"). This is what should be auto-pulled forward into each LCI.

## What we'll change

### 1. Fix the 7 Pillars → 8 F's ("Your Now")
- Rename `Faculty` → `Friends`, `Freedom` → `Field`, add the 8th if needed (the doc shows 7 "F" categories actually — Family, Finance, Faith, Fitness, Friends, Fun, Field — so it's still 7, just with corrected names).
- Add `subtopics` metadata per pillar (shown as helper text under each slider on Check-In and on the Pulse page).
- Add two free-text fields per pillar on Check-In: **"What's happening?"** and **"How does it feel?"** (matches the worksheet exactly).
- Update everywhere pillars are referenced: `src/lib/types.ts`, `Index.tsx`, `CheckIn.tsx`, `CoachDashboard.tsx`, `Correlations.tsx`, `boundless-assessment` edge function prompt, `coach-analytics` edge function (DB columns `faculty`/`freedom` → migrate to `friends`/`field`).
- DB migration: rename columns on `cohort_checkins` (`faculty` → `friends`, `freedom` → `field`).

### 2. New LCI module (`/lci`)
New page **"LCI"** in bottom nav (replaces "Bridge"/Scanner which is unused for this methodology — we'll remove Scanner from nav but keep the route).
- **List view**: prior LCIs with date, # top tasks, R/Y/G summary.
- **New LCI flow** (single scrolling form mirroring the worksheet):
  1. Confirm next LCI date/time (date picker)
  2. Highs & Lows — 4 textareas (Personal High, Business High, Personal Low, Business Low)
  3. **Review Last Top Tasks** — auto-loaded from previous LCI; for each: R/Y/G picker, "How do you feel?", "What's in the way?", "How can others help?" (textareas)
  4. **Year Review** — 4 categories (free text, prompted)
  5. **5 new Top Tasks** — 5 inputs
  6. **"What can I help you with?"** — textarea
- **AI summary**: after save, call edge function `lci-summary` (Lovable AI / Gemini) that produces a coach-ready briefing: themes, blockers, momentum signals, suggested questions for the next LCI call.
- DB tables: `lci_sessions`, `lci_top_tasks` (with `status` for R/Y/G + `feel`, `obstacles`, `help_needed` JSON columns), `lci_highs_lows`.

### 3. New Action Items tracker (`/actions`)
- Lightweight list, dated, with inline status notes (free text), checkbox done, source link to LCI.
- Auto-created when an LCI top task is saved (one Action Item per Top Task).
- Filter: Open / Completed / All. Group by date.
- Each action item supports an unlimited list of dated **status updates** ("Emailed on 04/15/2026, follow up email sent 04/24/2026").
- Nudge engine: if action item is open >7 days with no status update, queue a WhatsApp nudge ("How's [Top Task] going? Reply with an update.").
- DB: `action_items` (id, title, source_lci_id, due_date, completed_at), `action_item_updates` (id, action_item_id, note, created_at).

### 4. Nudges: add LCI prep reminder
- New nudge type `lci_prep`: fired **3 days before** a scheduled LCI date (matches transcript: "proactive reminders to complete forms three days before a coaching call").
- Add toggle in Nudges UI.

### 5. Bottom nav cleanup
New tabs (max 5 for mobile): **Pulse · Check-in · LCI · Actions · Coach**. Move Nudges/Insights/Coaches into a "More" sheet or under Coach dashboard.

## Technical details

**Files to edit**
- `src/lib/types.ts` — pillar enum + subtopics map + LCI/Action types
- `src/pages/CheckIn.tsx` — 8-F renames, add reflection textareas
- `src/pages/Index.tsx`, `src/pages/Correlations.tsx`, `src/pages/CoachDashboard.tsx` — pillar renames
- `src/components/BottomNav.tsx` — restructure tabs
- `src/App.tsx` — add `/lci`, `/lci/new`, `/actions` routes
- `supabase/functions/boundless-assessment/index.ts` — pillar renames in prompt
- `supabase/functions/coach-analytics/index.ts` — column renames
- `supabase/functions/nudge-engine/index.ts` — add `lci_prep` template + scheduling logic

**Files to create**
- `src/pages/LCI.tsx` (list), `src/pages/LCINew.tsx` (form)
- `src/pages/Actions.tsx`
- `supabase/functions/lci-summary/index.ts`
- Migration: rename pillar columns + create `lci_sessions`, `lci_top_tasks`, `lci_highs_lows`, `action_items`, `action_item_updates` (public RLS to match the rest of the app for now).

**Out of scope for this round**
- Auth (still public RLS, consistent with current state)
- Workshop QR mode, gamification, AI sentiment-based tier 3 nudges (transcript "AI suggestions" — defer)
- The "Bridge"/Scanner page stays as-is (just removed from primary nav)

Approve and I'll implement in one pass.
