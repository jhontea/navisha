# /fe-add-component

Scaffold a new React component in the Navisha frontend.

**Usage**: `/fe-add-component <feature> <ComponentName> <description>`

Example: `/fe-add-component trip TripCard "Card showing trip summary on dashboard"`

## Steps

1. **Determine component location**:
   - Feature-specific → `src/components/features/{feature}/{ComponentName}.tsx`
   - Reusable primitive → `src/components/ui/` (shadcn style — only if truly generic)

2. **Choose Server vs Client Component**:
   - Default: **Server Component** (no directive needed)
   - Add `"use client"` if the component uses: `useState`, `useEffect`, event handlers, browser APIs, TanStack Query hooks, Zustand stores

3. **Component structure**:
   ```tsx
   // Server Component (default)
   import type { Trip } from "@/types"

   interface TripCardProps {
     trip: Trip
   }

   export function TripCard({ trip }: TripCardProps) {
     return (
       // JSX
     )
   }
   ```

   ```tsx
   // Client Component
   "use client"

   import { useState } from "react"

   interface Props { ... }

   export function SomeInteractiveComponent({ ... }: Props) { ... }
   ```

4. **Styling**: Tailwind classes only. Use `cn()` from `lib/utils.ts` for conditional classes.

5. **shadcn/ui**: Import from `@/components/ui/` — never modify files in that folder.

6. **Types**: Add or reuse types from `src/types/`. Match the shape returned by `docs/API.md`.

7. **Exports**: Use named exports (not default exports) for all components.
