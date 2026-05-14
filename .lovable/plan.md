## Re-theme: Boundless.me visual overhaul

Bring the app's look in line with boundless.me — cinematic mountain photography, deep charcoal canvas, burnt-orange burn highlights, ultra-wide-tracked uppercase display type, and a Playfair Display italic serif for human/quote moments. Scope is presentation only; no business logic, schema, or auth changes.

### A. Design tokens (`src/index.css`, `tailwind.config.ts`)

Refine the existing palette toward the site's actual sampled values and add depth tokens:

- `--background` → `220 14% 7%` (deeper near-black charcoal)
- `--card` → `220 12% 11%` with subtle warm tint
- `--primary` (burnt orange) → `22 90% 52%` with `--primary-glow` `28 95% 60%`
- `--accent-warm` → warm amber `35 85% 55%` for secondary highlights
- New `--gradient-hero` (radial: charcoal → orange burn at edges, mimicking their hero)
- New `--gradient-overlay` (top-to-bottom transparent → charcoal, for image overlays)
- New `--shadow-cinematic` (large soft orange-tinted shadow for hero cards)
- New `--shadow-elevated` (crisp neutral shadow for cards)
- Border radius tightened: `--radius` → `1rem` (cards) with new `--radius-pill` for buttons
- Add `font-serif` family in Tailwind config

Add Tailwind utilities for `bg-gradient-hero`, `shadow-cinematic`, `text-balance`, and a `tracking-display` (0.18em).

### B. Typography (`src/index.css`)

- Keep Inter (400–900) for UI/body
- Add Playfair Display (italic 400/500) for pull quotes, taglines, and emotional accents
- Add reusable typography classes: `.h-display` (uppercase, `font-black`, `tracking-display`, balanced), `.h-quote` (Playfair italic), `.eyebrow` (small uppercase orange label like "IT'S TIME TO PURSUE")

### C. Reusable presentation components (new, `src/components/visual/`)

1. `HeroFrame.tsx` — full-bleed background image slot with gradient overlay, eyebrow + display headline + body + CTA. Used on Pulse top, Auth left panel, Coach hero.
2. `CinematicCard.tsx` — card variant with warm border glow and subtle inner gradient.
3. `PullQuote.tsx` — Playfair italic quote with orange quotation glyph and attribution.
4. `SectionEyebrow.tsx` — small uppercase orange chip used to label sections.
5. `MountainMark.tsx` — refined SVG mark replacing the lucide `Mountain` icon to match the site's triangular peak logo.

### D. Imagery

Generate two reusable hero images (premium quality, no text):

- `src/assets/hero-mountains.jpg` — wide cinematic mountain valley, golden-hour orange rim light, dark foreground (matches their hero)
- `src/assets/hero-summit.jpg` — alpine ridgeline at dawn for Coach/Auth pages

### E. Page-level restructuring (presentation only)

1. **`src/pages/Index.tsx` (Pulse)** — wrap top in `HeroFrame` with mountain background, eyebrow "YOUR MONTHLY PULSE", display headline, then radar card floats over the gradient seam. Replace icon with `MountainMark`. Quick-stats become `CinematicCard` trio.
2. **`src/pages/Auth.tsx`** — split-screen: left = full-bleed mountain image with logo, eyebrow, display tagline ("A LIFE THAT FEELS LIKE YOURS") and a Playfair quote rotator; right = existing form on dark panel. Mobile collapses to stacked.
3. **`src/pages/Coach.tsx`** — slim hero band with eyebrow + display title; chat surface in a `CinematicCard`.
4. **`src/pages/CoachDashboard.tsx`** — header band gets eyebrow/display treatment; metric tiles become `CinematicCard`.
5. **`src/components/BottomNav.tsx`** — refined active state (orange top-bar indicator + glow), tighter type, swap Pulse icon to `MountainMark`.
6. **`src/pages/AccessDenied.tsx`, `NotFound.tsx`** — adopt `HeroFrame` + Playfair line for the message.

### F. Buttons & micro-interactions

- Primary button: warm orange → orange-glow gradient, pill radius, soft cinematic shadow, subtle hover lift (`translate-y-[-1px]`)
- Add a `premium` variant via `cva` to `src/components/ui/button.tsx` (no breaking changes to existing variants)
- Card hover: gentle border-color shift to `primary/40` + shadow grow

### G. Memory updates

- Update `mem://style/visual-identity` and `mem://design/typography` with the refined palette HSLs and the Playfair Display italic addition
- Add new `mem://design/imagery` rule: cinematic mountain/golden-hour photography, dark foregrounds, orange rim light

### Out of scope

- No changes to data model, RLS, edge functions, routing config, or auth flow
- No changes to LCI, CheckIn, Actions, Scanner, Nudges, Correlations content/logic (they'll inherit token + button changes automatically)
- No copy rewrites beyond hero eyebrows/taglines on pages explicitly listed in §E

### Validation

After implementation: visit `/`, `/auth`, `/coach`, `/coach-dashboard`, `/access-denied` in the preview, screenshot each, and confirm the cinematic palette + Playfair quote treatment renders correctly on desktop and the 390px mobile breakpoint.
