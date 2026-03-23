

# Boundless.me Digital Companion

## Visual Identity & Design System
- Implement "Digital Paper" theme with the specified color palette: Deep Slate (#0F172A), Boundless Teal (#14B8A6), Deep Orange (#F97316), Off-White (#F8FAFC)
- Inter font with heavy weights for headings, rounded-3xl cards with border-2 border-slate-200
- Custom CSS variables and Tailwind config updates throughout

## Pages & Navigation
- **Home / Dashboard** – The Pulse radar chart + quick stats + insight cards
- **Check-in** – Monthly pillar rating flow
- **Scanner (Bridge)** – OCR journal capture with review screen
- **AI Coach ("So That")** – Guided 7-levels-of-why chat
- **Correlations** – Dashboard with overlaid charts and AI insights
- Bottom tab navigation with icons for each section

## Feature 1: The Pulse (Radar Chart)
- Interactive radar/spider chart (using Recharts) displaying 7 pillars: Family, Finance, Faith, Fitness, Faculty, Fun, Freedom
- "Monthly Check-in" button opens a full-screen flow with vertical sliders (1-10) per pillar
- Scores < 5 highlighted in orange as "Priority Opportunities"
- Store check-in history in local state (localStorage for persistence)

## Feature 2: The Bridge (Journal Scanner)
- Floating action button with camera icon on all screens
- Mock OCR flow: user can upload/capture an image, then sees a "Review & Confirm" screen
- Editable fields for: Daily Rating (-2 to +2), Step Count, Top Priority (with checkbox), 3 Gratitude items, Best Self Habit toggles
- Data saves to local state and feeds into the dashboard

## Feature 3: The "So That" AI Coach
- Chat-style interface with the Boundless Coach persona
- User enters a Priority, AI asks "Why?" 7 times, each referencing the previous "So that..."
- Progress indicator showing depth level (1-7)
- Final "Truth Statement" card generated and saveable to dashboard
- Powered by Lovable AI via edge function (will enable Lovable Cloud)

## Feature 4: Correlation Dashboard
- **Graph A**: Daily Rating (line) overlaid with Step Count (bar) using Recharts composed chart
- **Graph B**: Scatter plot of Best Self completion % vs Pillar Scores
- **Insight Cards**: AI-generated one-liner advice based on data patterns
- Seed with sample data for demo purposes

## Data & State
- Local state with localStorage persistence for all journal entries, pillar scores, and truth statements
- No database initially – all client-side with mock data for demo
- AI Coach feature requires Lovable Cloud edge function

