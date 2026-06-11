# /fe-add-page

Scaffold a new page in the Navisha Next.js frontend following App Router conventions.

**Usage**: `/fe-add-page <route-path> <description>`

Example: `/fe-add-page trips/[id] "Trip detail page with itinerary and map"`

## Steps

1. **Read context first**: Check `frontend/CLAUDE.md` for conventions and folder structure.

2. **Determine route group**:
   - Unauthenticated pages → `src/app/(auth)/`
   - Authenticated/protected pages → `src/app/(dashboard)/`

3. **Create the page file**: `src/app/(group)/{route}/page.tsx`
   - Default to Server Component (no `"use client"`)
   - Add `"use client"` only if the page needs hooks, interactivity, or browser APIs
   - For protected pages, check auth in the Server Component or via middleware

4. **Create feature components** in `src/features/{feature}/components/`:
   - Break the page into focused components
   - Data-fetching components: Server Components
   - Interactive components: Client Components with `"use client"`
   - UI primitives (Button, Input, Dialog, etc.) from `src/components/ui/` — coss ui, do not modify

5. **Data fetching**:
   - Server Component: use `lib/api.ts` fetch directly (benefits from Next.js cache)
   - Client Component: use TanStack Query (`useQuery` / `useMutation`)
   - Never call raw `fetch` inside components — always go through `lib/api.ts`

6. **Forms** (if needed):
   - React Hook Form + Zod
   - Define Zod schema in the same file as the form component

7. **TypeScript types**: Add response types to the relevant `src/features/{feature}/types.ts`.

8. **Navigation**: Update nav links or add to any sidebar/tab component if the page needs to be discoverable.

9. **Reference**: Check `docs/API.md` for the endpoint this page consumes.
