
# Boundless Life Guide — step-by-step workshop on /guide

Turn `/guide` into a paginated wizard that walks one user through the printed Boundless Life Guide, page by page, so a facilitator can lead a classroom and say "everyone, we're now on Step 3" and each participant fills in the matching screen on their own device. The data lands in the same tables the rest of the app already reads from (Pulse, AI Coach, Actions), so the workshop populates the platform — not a parallel data island.

A separate facilitator/classroom layer (advance-the-room, see-who's-done) is **out of scope for this round** and will be added later.

---

## A. Vocabulary alignment (one-time rename)

The printed guide uses different words than the app. We align the app to the PDF.

1. **Pillars:** rename `Faculty → Friends` and `Freedom → Field` everywhere — `lib/types.ts` (`PILLARS`, `PILLAR_SUBTOPICS`), every page that displays the labels, the radar chart, weekly resets, AI coach prompts. `cohort_checkins` and `user_weekly_resets` columns are already named `friends` and `field`, so no DB migration needed there. Existing `user_pillar_scores.pillar` and `user_pillar_state.pillar` are free-text, so we issue an `UPDATE` to remap any existing rows from `Faculty`/`Freedom` to `Friends`/`Field`.
2. **Year categories:** rename `Being / Relating / Doing / Having → Relationships / Achievements / Habits / Wealth` in `useGuide.ts` (`YearCategory`, `YEAR_CATEGORIES`, `CATEGORY_DESCRIPTIONS`) and run an `UPDATE user_year_priorities SET category = …` to remap existing rows.
3. Update `mem://index.md` Core line to say "Family, Finance, Faith, Fitness, Friends, Fun, Field" and the new Year categories.

No schema changes are required — only data updates and code changes.

## B. New schema for things the printed guide captures that the app doesn't

One migration adds:

- `workshop_sessions` — one row per user per workshop run. Tracks `current_step`, `completed_at`, `mantra` text, `future_self_date` (the 10+ year date), `future_self_age`, and a JSON `important_people` array (`[{ name, age }]`) for "Your Life" page. RLS: own-row only.
- `user_best_self_habits` — the "Starts / Stops" daily habits from page 7. Columns: `habit_text`, `kind` ('start' | 'stop'), `position`, `is_active`. RLS own-row. The Pulse / Journal habit checklist will read from this so what they wrote in the workshop becomes their daily habit list.
- `user_month_actions` — page 8's "up to six 30-day actions". Columns: `action_text`, `position`, `due_date`, `completed_at`, `cycle_id` (FK to `user_cycles`). On step completion we also write each one into `action_items` so they show on /actions and can be coached against.

Reused as-is:
- `user_life_vision` ← "Your Life" narrative (rendered from the future-state grid).
- `user_year_priorities` ← "Your Year" four columns.
- `user_truth_statements` ← "Your Why" 7-levels output (already perfect for this).
- `user_pillar_state` (current_state / future_state) ← "Your Now" reflections.
- `user_checkins` + `user_pillar_scores` ← "Your Now" 1–10 scores (creates a checkin tagged as the workshop baseline).
- `user_year_priorities` "Priority Ideas" go into a new `kind` column on the same table (`'priority_idea' | 'year_priority'`) so page 2 ideas live alongside the priorities they may become. (Adds `kind text default 'year_priority'` and `general_idea text` is held in a sibling table `user_general_ideas { idea_text, position }`.)

## C. The wizard

`/guide` becomes a 9-step flow. Top of every step: progress bar (Step N of 9), step title, facilitator-style intro paragraph quoted from the PDF, the PDF page thumbnail as a reference card the user can expand. Bottom of every step: Back / Save & continue / "I'll come back to this".

```text
Step 1  Welcome + Name              → confirms profile.display_name
Step 2  Your Ideas                  → user_general_ideas + user_year_priorities(kind=priority_idea)
Step 3  Your Now — scores           → user_checkins + user_pillar_scores (1–10 per pillar)
Step 3b Your Now — reflection       → user_pillar_state.current_state + how_it_feels per pillar
Step 4  Your Life (10+ yrs)         → workshop_sessions(date, age, important_people)
                                      + 4 future-state lists per category
                                      → composes user_life_vision.vision_text
Step 5  Your Year + Mantra          → workshop_sessions.mantra
                                      + user_year_priorities(kind=year_priority) per category
Step 6  Your Why (7 levels)         → user_truth_statements (loops through chosen Priority Ideas;
                                      uses existing AI coach edge function for the prompts)
Step 7  Your Best Self Starts/Stops → user_best_self_habits
Step 8  Your Month                  → user_month_actions + action_items + opens a user_cycles row
Step 9  Recap + Next                → read-only summary, "Print my guide" (browser print CSS),
                                      CTA to start daily journaling
```

Each step component lives in `src/components/workshop/steps/Step{N}*.tsx`. Shared chrome lives in `src/components/workshop/WorkshopShell.tsx`. State is loaded via a new `src/hooks/useWorkshop.ts` (TanStack Query) — no fetching from page components.

`workshop_sessions.current_step` is the source of truth for "where am I" so a user (or later, a whole classroom) can resume mid-workshop on a different device. Autosave on blur for every text field, debounced 800ms; the bottom bar shows "Saved · 2s ago" and disables "Continue" only when a step has hard-required inputs (e.g. Step 3 requires all 7 scores).

Routing:
- `/guide` → if no `workshop_sessions` row, show landing splash with hero from `boundlessfarm.com` style and "Start the Boundless Life Guide" CTA + "Skip to the dashboard view" link.
- `/guide/step/:n` → individual step.
- `/guide/recap` → Step 9 view (also linkable from BottomNav).

## D. Facilitator hooks left in place for the next round

We add but don't surface:
- `workshop_sessions.cohort_id` (nullable FK to `cohort_members.coach_id`)
- a `workshop_step_completions` table (`workshop_session_id`, `step`, `completed_at`)

so when we add the facilitator view we can already query "show me everyone in cohort X who's still on Step 4" without another migration.

## E. Things touched downstream

- BottomNav / DesktopNav: "Guide" stays in the same slot, label stays "The Guide".
- AI Coach prompt (`supabase/functions/boundless-coach/index.ts`): pull from the new "Best Self habits" and "Month actions" tables when composing context.
- /actions: source from `action_items` (already does), but tag workshop-originated items with a small "🌾 from workshop" badge.
- Pulse radar chart: relabel Faculty→Friends, Freedom→Field.
- `mem://features/...` notes for 7-Pillars-Pulse and AI-Coach updated to reflect new pillar names.

## F. Out of scope (explicit)

- Facilitator presenter view, classroom advance-the-room, realtime "X of 12 done" widget.
- Editing the printed PDF / exporting a filled PDF (Step 9 uses browser print only).
- Migrating historical Faculty/Freedom analytics charts beyond a label rename.

---

## Order of execution

1. Migration: add `workshop_sessions`, `user_best_self_habits`, `user_month_actions`, `user_general_ideas`, `workshop_step_completions`, `user_year_priorities.kind`, RLS, triggers.
2. Data update: remap `Faculty/Freedom` and `Being/Relating/Doing/Having` rows.
3. Code rename of pillars + year categories across the app.
4. `useWorkshop` hook + `WorkshopShell`.
5. Steps 1 → 9 (each is a small file, built in order, validated in the preview after each).
6. Replace `/guide` page to delegate to the wizard; keep old summary blocks as Step 9 recap content.
7. AI Coach + Pulse downstream tweaks, mem updates.
