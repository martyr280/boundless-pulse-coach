## Goal

Keep the existing 9-step Boundless Life Guide workshop intact, but let users (1) jump to any step in any order, and (2) always see every field they've entered in a single Overview view — with one-click jump-back into the relevant step to edit.

## Current state

- `src/pages/Guide.tsx` renders one of: Landing → `Step1Welcome` … `Step9YourMonth` → `Recap`, controlled by `?step=N` / `?view=recap`.
- `WorkshopShell` enforces linear Back/Next.
- `Recap` already aggregates every dataset (vision, year priorities, pillar scores, reflections, future-state pillars, whys, habits, month actions) but is only reachable at the end.
- Underlying data already comes from independent hooks (`useGuide`, `useWorkshop`, `useTruthStatements`, `useCheckins`), so no backend changes are needed.

## What changes

### 1. Two top-level views via tabs: **Workshop** and **Overview**

Add a persistent `Tabs` header inside `GuidePage` (above the step content, hidden on Landing & print):

- **Workshop** — current stepper experience, but with free navigation (see #2).
- **Overview** — the existing `Recap` content, always reachable, plus an "Edit this section" button on each card that jumps to the matching step.

URL contract: `?view=workshop&step=N` (default) and `?view=overview`. Existing `?view=recap` continues to work as an alias for `overview`.

### 2. Free step navigation in Workshop view

Add a **Step Index rail** at the top of `WorkshopShell` showing all 9 steps as clickable chips with state:
- ✓ filled (data entered for that step)
- ● current
- ○ empty

Clicking any chip calls `goStep(n)` — no completion gating. The existing Back/Next buttons stay for sequential users; the chip rail is for jumping. `markComplete` continues to fire on Next so the underlying `current_step` and `workshop_step_completions` still track progress.

Compute "filled" per step from existing query data:
- 1 → profile.display_name present
- 2 → any general idea OR priority idea
- 3 → today's checkin exists
- 4 → any pillar `whats_happening` / `how_it_feels` reflection
- 5 → any pillar `future_state`
- 6 → any year_priority (kind = year_priority)
- 7 → any truth_statement
- 8 → any best_self_habit
- 9 → any month_action

### 3. Overview enhancements

- Reuse the existing `Recap` JSX, but render it under the Overview tab regardless of `completed_at`.
- For each section card (Vision, Ideas, Now, Reflections, Life, Year, Why, Best Self, Month), add a small **"Edit"** affordance in the card header that links to `?view=workshop&step=<matching step>`.
- Empty sections render a soft prompt ("Nothing here yet — start step 5 →") instead of being hidden, so the Overview really represents "every field" rather than only what's filled.

### 4. Landing tweak

The Landing splash stays, but its primary CTA changes label based on state:
- No session → "Begin the workshop"
- In progress → "Continue at step N" + secondary "See overview"
- Completed → "Open overview" + secondary "Revisit the workshop"

### 5. Out of scope

- No DB/schema changes.
- No edits to the per-step UIs themselves — they keep their current inline Save behavior.
- PDF export and print continue to render the Overview; no change to that pipeline.

## Files touched

- `src/pages/Guide.tsx` — add Tabs wrapper, StepIndexRail component, edit links on Recap cards, Landing CTA logic.
- (Possibly) split `Recap` and a new `StepIndexRail` into `src/components/guide/` if `Guide.tsx` gets too long, but otherwise leave structure as-is.

## Acceptance

- From any step, the user can click any other step chip and land there with their data preserved.
- The Overview tab is reachable at any time and shows every section, filled or empty, with an Edit shortcut to its step.
- Existing linear Back / Save & continue flow still works end-to-end.
