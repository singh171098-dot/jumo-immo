# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint (eslint-config-next)

npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma migrate dev       # Apply schema migrations (requires DATABASE_URL)
npx prisma studio            # Open Prisma visual DB explorer
```

Seed the DB via `GET http://localhost:3000/api/seed` after running the dev server.

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # Required for Map3D — shows error tile without it
```

## Architecture

This is a **Next.js 16 App Router** project. Before writing code, consult the relevant guide in `node_modules/next/dist/docs/` — APIs and conventions may differ from your training data.

### Routing Split

The project has two distinct navigation models that coexist:

1. **State-based SPA** (`app/page.tsx`): The homepage is a single large file where `currentView` state switches between five views — `"landing"`, `"map"`, `"listings"`, `"news"`, `"paperwork"`. These are **not** separate routes.

2. **Real App Router routes**: `app/annonces/[id]/page.tsx` (property detail) and `app/espace-vendeur/` (seller dashboard with its own layout) are true Next.js routes.

### Key Components

- **`components/Map3D.tsx`**: Mapbox GL 3D map. Uses `forwardRef` and exports `MapHandle` with a `flyTo(lng, lat)` method so the parent (`app/page.tsx`) can imperatively fly the camera. Markers and popups are created with raw DOM (not React) to avoid Mapbox/React lifecycle conflicts. Mapbox's `transform` must never be overridden on the root marker element — only apply animations to the inner element.

- **`components/FairPriceCard.tsx`**: Sidebar card on the property detail page that displays the DVF fair-price analysis.

- **`components/DossierJuridique.tsx`**: Document checklist component used in the seller dashboard.

- **`components/PaperworkWizard.tsx`**: Step-by-step legal purchase guide.

### Data & Business Logic

- **`lib/utils/pricingLogic.ts`**: `calculatePropertyMetrics()` computes the **FairScore** — it compares `askingPrice / surface` against `localDvfAverage` (the official DVF €/m² for that city). A price >10% above DVF average = `SURÉVALUÉ`; ≥0% = `PRIX DU MARCHÉ`; negative = `EXCELLENTE AFFAIRE`.

- **`lib/utils/formatters.ts`**: `formatPrice()` — always use this for displaying prices in `fr-FR` locale (e.g., `340 000 €`).

- **`prisma/schema.prisma`**: PostgreSQL schema. Core models: `User` (BUYER/SELLER/ADMIN), `Property` (with `fairScore` 0–100 and `cityAvgPerSqm` DVF reference), `Offer`, `Document`. Prices stored as integers (euros, no cents).

### External APIs

- **`api-adresse.data.gouv.fr`** — French address autocomplete on the homepage search bar (no key needed).
- **Mapbox Geocoding API** (`api.mapbox.com/geocoding/v5/`) — used inside Map3D for its internal search (requires `NEXT_PUBLIC_MAPBOX_TOKEN`).

### Styling Approach

The codebase uses **two styling systems** depending on the file:

- `app/page.tsx`: Pure inline styles + a `<style>` tag (`STYLE_TAG` constant) with CSS custom properties (`--c-bg`, `--c-blue`, `--c-gold`, etc.) and keyframe animations. Do not introduce Tailwind here.
- All other files (`annonces/`, `espace-vendeur/`, `components/`): Tailwind CSS classes. Do not introduce inline styles here.

CSS variables are defined inside `STYLE_TAG` in `app/page.tsx`. The fonts loaded there (`Playfair Display`, `DM Sans`) differ from the `Plus Jakarta Sans` loaded globally in `app/layout.tsx` — both are in use.

## Project Context: jumo-immo.fr

A premium peer-to-peer French real estate platform. Mission: buy/sell property without agency fees, with price transparency using official government DVF (Demandes de Valeurs Foncières) data.

### Brand & Design System

- **Primary:** Deep Royal Blue (`#1E3A8A`) — trust, notaires, legal.
- **Secondary:** Emerald Green (`#10B981`) — savings, fair prices, good DPE.
- **Typography:** `Plus Jakarta Sans` (global). `Playfair Display` + `DM Sans` (homepage dark theme).
- **Layout:** Split-screen (map left, cards right). Edge-to-edge hero sections with white space.

### Animation Rules (Strictly Enforced)

- **Hover zoom on cards:** `group overflow-hidden` on card, `group-hover:scale-105 transition-transform duration-500` on image.
- **Scroll reveal:** Framer Motion `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}>`.
- **Skeleton loading:** `animate-pulse bg-gray-200` — no spinners when fetching DVF data.

### Images

Use real Unsplash URLs (e.g., `https://images.unsplash.com/photo-...`) for all UI prototypes. Never use gray placeholder boxes.

### Workflow

- Provide FULL, copy-pasteable code. No placeholders like `// add logic here`.
- User-facing text: standard French. Code variables/comments: English.
DESTRUCTIVE EDITS FORBIDDEN : When adding backend logic  (prisma,APIs) , you MUST preserve the existing frontend UI, state machines, and styling. never overwrite a complex UI with a bare-bones test component.
## Mobile UX Rules (Critical)

- The map is ALWAYS the primary interface on mobile
- NEVER redirect user to listings immediately after search
- Search must trigger map flyTo first, then user selects markers
- Search bar must auto-hide after selection and reappear after inactivity
- Map interactions must always feel native (no lag, no blocking layers)

## Interaction Philosophy

- Map-first experience (like Bien'ici, Google Maps)
- Listings are secondary, triggered by user intent
- No forced navigation
- Smooth, premium animations only (no abrupt UI changes)