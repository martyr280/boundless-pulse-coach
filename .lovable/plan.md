## Plan: Switch logo & favicon to Boundless Farm branding

The real Boundless Farm logo is a hand-drawn highland cow with "EST. 2024 · BOUNDLESS · FARM" wordmark (black on transparent). They also publish a white version for dark backgrounds. Current app uses a custom mountain SVG (`MountainMark`) with a "Boundless" text label.

### Assets to add (downloaded from boundlessfarm.com)
- `public/boundless-logo.png` — full wordmark, black on transparent (light surfaces)
- `public/boundless-logo-light.png` — full wordmark, white on transparent (dark surfaces / nav)
- `public/favicon.png` — square crop of just the cow head (generated)
- Delete `public/favicon.svg` (existing mountain mark)

### Code changes
1. **`index.html`** — swap `<link rel="icon">` to `/favicon.png`.
2. **`src/components/visual/MountainMark.tsx`** — keep the component name/API (still used as the brand mark across nav, auth, etc.) but render the cow-head crop `<img src="/favicon.png">` instead of the mountain SVG. `className` continues to control size.
3. **`src/components/DesktopNav.tsx`** — keep `<MountainMark>` next to the "Boundless" wordmark in the sidebar header (now shows cow + word).
4. **`src/components/BottomNav.tsx`** — Pulse tab icon stays as `MountainMark` (now cow head).
5. **`src/pages/Auth.tsx`** — replace the small MountainMark + "Boundless" text combo at the top of the auth card with a single full wordmark `<img src="/boundless-logo-light.png">` for a stronger first impression. Hero side keeps `MountainMark` as the small accent.

### Out of scope
- No nav copy changes; just iconography.
- No color/theme changes — palette already matches the farm site.