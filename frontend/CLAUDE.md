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
│   │   ├── auth/
│   │   │   ├── components/         # LoginButton, LogoutButton
│   │   │   ├── hooks.ts            # useAuth, useLogout
│   │   │   ├── store.ts            # Zustand auth store
│   │   │   └── types.ts            # User
│   │   ├── trip/
│   │   │   ├── components/         # TripCard, TripForm, TripDetail
│   │   │   ├── hooks/              # useTrips, useCreateTrip, useUpdateTrip
│   │   │   └── types.ts            # Trip, TripSummary, Day, Activity, Transportation, Accommodation
│   │   ├── itinerary/
│   │   │   ├── components/         # DayView, ActivityCard, ActivityForm
│   │   │   └── hooks/              # useActivities, useCreateActivity
│   │   └── budget/
│   │       ├── components/         # ExpenseList, ExpenseForm, BudgetSummary, CurrencyConverter
│   │       ├── hooks/              # useExpenses, useCurrencyRates
│   │       └── types.ts            # Expense, ExpenseSummary, CurrencyRate
│   ├── components/
│   │   ├── ui/                     # coss ui primitives (Base UI–backed) — do not modify generated files
│   │   └── providers.tsx           # TanStack QueryClientProvider
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrapper (credentials: include, ApiError)
│   │   └── utils.ts                # cn(), formatCurrency(), formatDate(), formatDateRange()
│   └── middleware.ts               # Auth guard: redirect unauthenticated → /login
└── public/
```

## Conventions

### Components
- Server Components by default in `app/`
- Add `"use client"` only when using hooks, events, or browser APIs
- Feature components in `features/<feature>/components/`
- Primitive UI in `components/ui/` (coss ui — never modify generated files)
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
- Tailwind only — no inline styles
- `cn()` from `lib/utils.ts` for conditional class merging
- Responsive: mobile-first (sm → md → lg breakpoints)

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
