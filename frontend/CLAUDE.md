# Frontend — Claude Context

## Stack
Next.js 14 (App Router), TypeScript, Tailwind CSS v3, coss ui (Base UI–backed), Zustand, TanStack Query

## Libraries

| Library | Purpose |
|---------|---------|
| Next.js 14 | Framework, App Router, SSR |
| TypeScript 5 | Type safety |
| Tailwind CSS 3 | Utility-first styling |
| coss ui | Accessible UI primitives built on Base UI, shadcn-style CLI install — files in `components/ui/`, do not modify generated files |
| TanStack Query v5 | Server state: caching, loading/error states, background refetch |
| Zustand v4 | Client/UI state: current user, UI toggles |
| React Hook Form v7 | Form state, performant re-renders |
| Zod v4 | Schema validation — used alongside RHF for form validation |

## coss ui Skill

Skill installed at `.agents/skills/coss/` + `.agents/skills/coss-particles/`. Provides component APIs, composition patterns (Field, DialogHeader/DialogPanel/DialogFooter, `render` prop instead of `asChild`), migration rules from shadcn/Radix, and Tailwind v4 token conventions. Consult before adding new coss components.

## Project Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router — thin pages only
│   │   ├── page.tsx                # Landing page (public)
│   │   ├── (auth)/login/           # Login page (unauthenticated)
│   │   ├── (dashboard)/            # Protected pages
│   │   │   ├── dashboard/          # Trip list
│   │   │   ├── trips/[id]/         # Trip detail + itinerary
│   │   │   └── currency/           # Currency converter
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── features/                   # Feature slices — main code lives here
│   │   ├── accommodation/          # Stay CRUD + linked expense
│   │   ├── activity/               # Day timeline, ActivityForm (location | note | todo), lib/time.ts
│   │   ├── auth/                   # Login/logout, Zustand auth store
│   │   ├── currency/               # Rates + standalone converter
│   │   ├── expense/                # Expense list/form, budget summary
│   │   ├── location/               # Autocomplete (Geoapify / Google)
│   │   ├── map/                    # TripMap, MapLibre + Google renderers
│   │   ├── summary/                # AI trip summary
│   │   ├── transportation/         # Transport CRUD + linked expense
│   │   └── trip/                   # Trip list/detail, overview, share, lib/dates.ts
│   ├── components/
│   │   ├── ui/                     # coss ui primitives (Base UI–backed) — do not modify generated files
│   │   └── providers.tsx           # TanStack QueryClientProvider
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrapper (credentials: include, ApiError)
│   │   ├── currency.ts             # Supported currencies, flags, labels
│   │   └── utils.ts                # cn(), formatCurrency(), formatDate(), formatDateRange()
│   └── middleware.ts               # Auth guard: redirect unauthenticated → /login
└── public/
```

## Conventions

### Components
- `app/**/page.tsx` and `layout.tsx` are Server Components: they export `metadata` (tab title) and render one client screen from `features/<feature>/screens/` (e.g. `BudgetScreen`, `TripShell`). Data stays in TanStack Query on the client because it needs the auth cookie. `share/[token]` fetches on the server and passes the trip to the client view.
- Add `"use client"` only when using hooks, events, or browser APIs
- Feature components in `features/<feature>/components/`
- Primitive UI in `components/ui/` (coss ui — never modify generated files)
- Outside `src/components/`, no raw `<button>`, `<input>` (except `type="hidden"`), `<select>` or `<textarea>` (lint fails). Use `Button`, `Chip`, `SegmentedControl`, `SelectableRow`, `Input` (`variant="bare"` inside an input group), `NativeSelect`, `Textarea`. A genuinely custom control (calendar cell, listbox option, role=switch card) gets `eslint-disable-next-line no-restricted-syntax -- <reason>`.
- `app/` pages are thin — import from `features/`, no business logic in pages
- For trigger-based overlays (Dialog, DropdownMenu, etc.) use coss `render` prop, not `asChild`
- Consult `.agents/skills/coss/SKILL.md` and per-component references before composing new primitives

### Data Fetching
- Client Components: TanStack Query (`useQuery`, `useMutation`)
- All API calls go through `lib/api.ts` — never use raw `fetch` in components
- Query keys: `["feature", "action", id?]` e.g. `["trips", "list"]`, `["trips", "detail", tripId]`

### Forms
- React Hook Form + Zod (v4) for all forms
- Zod schema defined in the same file as the form component
- Custom Input/Textarea in `components/ui/` are native `<input>`/`<textarea>` wrapped in `React.forwardRef` so RHF `register()` ref attaches correctly. coss-shipped variants are non-forwardRef and break RHF — do not replace these with coss defaults.
- For coss Select / other components without native form-element semantics: use RHF `Controller` to bind value/onChange.

### State
- Server state: TanStack Query (trips, activities, expenses)
- UI state: Zustand (auth user, map open/closed, selected day)
- No cross-feature imports — `trip/` must not import from `auth/`

### Styling
- Follow `docs/DESIGN.md` (V2 "Soft": tokens, fonts, radius, components, checklist) and `docs/COPY_GUIDE.md` (glossary, button/error copy). Expense category rules are in `docs/DESIGN.md` §12.
- No `text-[Npx]` and no hex colors in classes (lint fails: `--max-warnings 0`); legacy `glass*` / `text-gradient*` / `chromatic-*` / MD3 tokens are gone, only the tokens in `tailwind.config.ts` exist
- Tailwind only — no inline styles
- `cn()` from `lib/utils.ts` for conditional class merging
- Responsive: mobile-first (sm → md → lg breakpoints)
- Themes: **light is the default**; dark is opt-in via `ThemeToggle` (cookie `navisha-theme`, applied by an inline script in `app/layout.tsx` before paint, never from the OS setting). Use tokens only so both themes work; check new UI in both.
- Fonts: `font-sans` (Nunito Sans) everywhere, `font-display` (Nunito) for titles and big numbers.

## Auth Guard (middleware.ts)

```
/                   → always public (landing page)
/login              → public; cookie present → redirect /dashboard
/dashboard, /trips  → protected; no cookie → redirect /login
```

Cookie `access_token` is httpOnly — middleware checks for its presence only (cannot read value from JS).

## API Base URL
`http://localhost:8090/api/v1` (dev) — set via `NEXT_PUBLIC_API_URL` env var

## Env Variables
```
NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## Checks
- `npm run lint`, `npm run typecheck`, `npm test` (Vitest, `*.test.ts` next to the source file), `npm run build`
- Unit-test pure helpers in `lib/` and `features/*/lib/` first; component and E2E tests come later (plan R3).
