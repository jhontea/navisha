# Navisha — Frontend

Next.js 14 App Router frontend for the Navisha travel itinerary app.

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:3000
```

Backend must be running at `http://localhost:8090` (see root `README.md` for setup).

## Architecture

- **App Router** — Server Components by default; `"use client"` only when needed
- **Feature slices** — `src/features/<feature>/{components,hooks,store.ts,types.ts}`
- **coss ui** — Base UI–backed component primitives in `src/components/ui/`
- **TanStack Query** — Server state; all API calls through `lib/api.ts`
- **Zustand** — Client state (auth, UI)
- **React Hook Form + Zod v4** — Form validation
- **Tailwind CSS** — Utility-first styling with custom design tokens

## Key Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint (next lint)
npx tsc --noEmit # Type check
```

## Related Docs

- Root project: [`../README.md`](../README.md)
- Architecture: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- API reference: [`../docs/API.md`](../docs/API.md)
- Agent context: [`./CLAUDE.md`](./CLAUDE.md)
- Design system: [`./template/DESIGN.md`](./template/DESIGN.md)
