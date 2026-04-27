# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint (eslint-config-next)

npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma db push           # Push schema changes to DB without migration file
npx prisma migrate dev       # Apply schema migrations (requires DATABASE_URL)
npx prisma studio            # Open Prisma visual DB explorer
```

Seed the DB via `GET http://localhost:3000/api/seed` after running the dev server.

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...          # Required for Map3D — shows error tile without it
AUTH_SECRET=...                               # Required for Auth.js v5 (next-auth@beta)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...         # Cloudinary upload widget
NEXT_PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Architecture

This is a **Next.js 16 App Router** project. Before writing code, consult the relevant guide in `node_modules/next/dist/docs/` — APIs and conventions may differ from your training data.

### Routing Split

The project has two distinct navigation models that coexist:

1. **State-based SPA** (`components/HomeClientUI.tsx`): The homepage client component where `currentView` state switches between five views — `"landing"`, `"map"`, `"listings"`, `"news"`, `"paperwork"`. `app/page.tsx` is a thin server wrapper that calls `auth()` and passes `sessionUser` + `dbProperties` as props. These views are **not** separate routes.

2. **Real App Router routes**: `app/annonces/[id]/page.tsx` (property detail), `app/espace-vendeur/` and `app/espace-acheteur/` (role dashboards with their own layouts) are true Next.js routes. Both dashboards are auth-protected — they call `auth()` and `redirect("/")` if no session.

### Authentication (Auth.js v5)

- **`auth.ts`** (root): NextAuth config. Uses `CredentialsProvider` + `session: { strategy: "jwt" }`. No PrismaAdapter — the Prisma schema has no `Account`/`Session` models and they must NOT be added. Direct Prisma query in `authorize()`.
- **`types/next-auth.d.ts`**: Augments `Session` and `JWT` with `id: string` and `role: string`.
- **`app/api/auth/[...nextauth]/route.ts`**: Auth.js HTTP handler.
- **`app/actions/auth.ts`**: `registerUser()` server action — bcrypt hash + Prisma create.
- **`components/AuthModal.tsx`**: Dark glassmorphism login/register modal. Uses `signIn`/`signOut` from `next-auth/react` (no SessionProvider needed). After login: `router.refresh()` re-renders server components with new session.
- Session flows from `app/page.tsx` (server) → `HomeClientUI` (client) as a `sessionUser: { name, role } | null` prop.

### Server Actions

- **`app/actions/communication.ts`**: `submitOffer`, `sendMessage`, `bookVisit`, `acceptOffer`, `refuseOffer`. Each writes to Prisma, calls `sendEmail()` to the seller, and `revalidatePath("/espace-vendeur")`.
- **`app/actions/property.ts`**: `createProperty(formData)` — parses FormData, validates, resolves city → coords + DVF avg via hardcoded `CITY_DATA` map, computes FairScore, creates `Property` + `Document` records in a transaction. Currently falls back to a demo seller — update to use `auth()` when integrating real user context.
- **`app/actions/auth.ts`**: `registerUser()`.

### Key Components

- **`components/Map3D.tsx`**: Mapbox GL 3D map. Uses `forwardRef` and exports `MapHandle` with a `flyTo(lng, lat)` method. Markers and popups are created with raw DOM (not React) to avoid Mapbox/React lifecycle conflicts. Never override `transform` on the root marker element — only animate inner elements.
- **`components/PropertyForm.tsx`**: Multi-step seller form. Validates required legal documents (ALUR law) before submission. DPE class, insulation, heating type, renovation year affect the FairScore.
- **`components/AuthModal.tsx`**: Login/register modal rendered in all 5 SPA views. Framer Motion slide animation, role selector (BUYER/SELLER).
- **`components/FairPriceCard.tsx`**: DVF fair-price sidebar on the property detail page.
- **`lib/email.ts`**: Mock email (no external provider) — logs HTML to console. Template uses Royal Blue + Gold brand.

### Data & Business Logic

- **`lib/utils/pricingLogic.ts`**: `calculatePropertyMetrics()` computes the **FairScore** — compares `askingPrice / surface` vs `localDvfAverage`. >10% above DVF = `SURÉVALUÉ`; ≥0% = `PRIX DU MARCHÉ`; negative = `EXCELLENTE AFFAIRE`.
- **`lib/utils/formatters.ts`**: `formatPrice()` — always use for displaying prices in `fr-FR` locale.
- **`prisma/schema.prisma`**: PostgreSQL schema. Core models: `User` (BUYER/SELLER/ADMIN), `Property` (with `fairScore` 0–100, `cityAvgPerSqm` DVF reference), `Offer`, `Visit`, `Message`, `Document`. Prices stored as integers (euros, no cents).

### External APIs

- **`api-adresse.data.gouv.fr`** — French address autocomplete on the homepage search bar (no key needed).
- **Mapbox Geocoding API** (`api.mapbox.com/geocoding/v5/`) — used inside Map3D (requires `NEXT_PUBLIC_MAPBOX_TOKEN`).
- **Cloudinary** — image uploads via `next-cloudinary` `CldUploadWidget`. Uses `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_API_KEY` on client; `CLOUDINARY_API_SECRET` server-side only.

### Styling Approach

The codebase uses **two styling systems** depending on the file:

- `components/HomeClientUI.tsx` (and anything it renders directly): Pure inline styles + a `STYLE_TAG` constant with CSS custom properties (`--c-bg`, `--c-blue`, `--c-gold`, etc.) and keyframe animations. **Do not introduce Tailwind here.**
- All other files (`annonces/`, `espace-vendeur/`, `espace-acheteur/`, all `components/`): Tailwind CSS classes. **Do not introduce inline styles here.**

CSS variables are defined inside `STYLE_TAG` in `HomeClientUI.tsx`. The fonts loaded there (`Playfair Display`, `DM Sans`) differ from the `Plus Jakarta Sans` loaded globally in `app/layout.tsx`.

## Project Context: jumo-immo.fr

A premium peer-to-peer French real estate platform. Mission: buy/sell without agency fees, with price transparency using official DVF data.

### Brand & Design System

- **Primary:** Deep Royal Blue (`#1E3A8A`) — trust, notaires, legal.
- **Secondary:** Emerald Green (`#10B981`) — savings, fair prices, good DPE.
- **Typography:** `Plus Jakarta Sans` (global). `Playfair Display` + `DM Sans` (homepage dark theme).
- **Layout:** Split-screen (map left, cards right).

### Animation Rules (Strictly Enforced)

- **Hover zoom on cards:** `group overflow-hidden` on card, `group-hover:scale-105 transition-transform duration-500` on image.
- **Scroll reveal:** Framer Motion `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}>`.
- **Skeleton loading:** `animate-pulse bg-gray-200` — no spinners when fetching DVF data.

### Workflow

- Provide FULL, copy-pasteable code. No placeholders like `// add logic here`.
- User-facing text: standard French. Code variables/comments: English.
- **DESTRUCTIVE EDITS FORBIDDEN**: When adding backend logic (Prisma, APIs), you MUST preserve the existing frontend UI, state machines, and styling. Never overwrite a complex UI with a bare-bones test component.

## Mobile UX Rules (Critical)

- The map is ALWAYS the primary interface on mobile.
- NEVER redirect user to listings immediately after search.
- Search must trigger map `flyTo` first, then user selects markers.
- Search bar must auto-hide after selection and reappear after inactivity.

## Interaction Philosophy

- Map-first experience (like Bien'ici, Google Maps).
- Listings are secondary, triggered by user intent.
- No forced navigation. Smooth, premium animations only.
