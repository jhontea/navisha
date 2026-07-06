# Mobile Task Breakdown

This document breaks Navisha mobile work into phases that can be implemented gradually.

Each phase should end with a small, testable result. Keep backend and mobile changes close together when auth or API contracts are involved.

---

## Phase 0 - Docs and Decisions

Status: Complete.

Goal: lock the first implementation shape before scaffolding.

Tasks:

- [x] Create `docs/MOBILE_SETUP.md`.
- [x] Create `docs/MOBILE_PLAN.md`.
- [x] Create `docs/MOBILE_TASK_BREAKDOWN.md`.
- [x] Update `docs/README.md`.
- [x] Confirm Android package name: `cloud.navisha.mobile`.
- [x] Confirm iOS bundle ID: `cloud.navisha.mobile`.
- [x] Confirm app scheme: `navisha`.
- [x] Confirm Android-first Windows workflow.
- [x] Confirm local backend as the default dev API.

Locked decisions:

| Decision | Value |
|----------|-------|
| Android package name | `cloud.navisha.mobile` |
| iOS bundle ID | `cloud.navisha.mobile` |
| App scheme | `navisha` |
| Primary local target | Android on Windows |
| Default development API | Local backend via LAN IP |
| Production API role | Smoke testing after mobile auth deploy |

Acceptance:

- A developer can understand the mobile direction from docs only.
- Backend local setup and Google login setup are documented.
- The remaining work is broken into phases small enough to execute independently.

---

## Phase 1 - Scaffold

Status: Complete.

Goal: create the mobile app shell.

Tasks:

- [x] Create an Expo app in `mobile/`.
- [x] Configure TypeScript.
- [x] Configure Expo Router.
- [x] Configure path aliases if needed. Not added yet; relative imports are enough for the scaffold.
- [x] Add `.env.example`.
- [x] Add `EXPO_PUBLIC_API_URL` documentation in the env example.
- [x] Add base scripts:
  - `start`
  - `android`
  - `lint`
  - `test`
  - `test:watch`
- [x] Add Jest with `jest-expo`.
- [x] Add React Native Testing Library.
- [x] Add a basic navigation shell:
  - loading route
  - login route
  - protected trips route
- [x] Add shared app providers:
  - TanStack Query provider
  - auth/session provider

Acceptance:

- [x] `cd mobile && npm install` succeeds.
- [x] `npx expo start` opens the app. Metro is running at `http://localhost:8081`.
- [ ] Android emulator can render the initial route. Not launched from this session.
- [x] `npm test` runs at least one simple test.

---

## Phase 1.5 - UI Shell

Status: Complete.

Goal: make the scaffold feel like Navisha before real auth/data lands.

Tasks:

- [x] Add a small mobile theme token file for colors, spacing, and radius.
- [x] Add shared UI primitives:
  - card
  - button
  - screen with footer slot
- [x] Add product shell components:
  - app header
  - bottom nav preview
  - quick actions
- [x] Restyle login into a product-style mobile entry screen.
- [x] Restyle trips shell into a dashboard preview with:
  - upcoming trip card
  - itinerary quick actions
  - today preview
  - API target note
- [x] Add icon support with `@expo/vector-icons`.
- [x] Align the Phase 1.5 shell colors with the web brand direction:
  - Navisha primary blue
  - blue-to-purple gradient accents
  - soft blue and aurora surfaces
- [x] Keep all data as static placeholder data until Phase 2-4.

Acceptance:

- [x] `/login` looks like a Navisha mobile screen, not a default scaffold.
- [x] `/trips` looks like a mobile dashboard shell.
- [x] Bottom navigation preview is visible.
- [x] No backend is required.
- [x] `npx tsc --noEmit`, `npm test -- --runInBand`, and `npm run lint` pass.

---

## Phase 2 - Auth

Goal: make mobile login and authenticated API calls work.

Backend tasks:

- Add `POST /api/v1/auth/google/mobile`.
- Verify Google identity from the mobile login result.
- Reuse existing user upsert behavior.
- Return `{ user, access_token, refresh_token }`.
- Add `POST /api/v1/auth/refresh/mobile`.
- Return a new token pair from a refresh token in the request body.
- Ensure `GET /api/v1/auth/me` works with `Authorization: Bearer <access_token>`.
- Update CSRF middleware so Authorization-header mobile requests are not blocked.
- Add backend tests for mobile login, mobile refresh, invalid token, and CSRF skip behavior.

Mobile tasks:

- Add Google login with `expo-auth-session` or a native Google Sign-In library.
- Use an Expo development build for OAuth testing.
- Add `mobile/src/lib/auth-token.ts` using `expo-secure-store`.
- Add auth store with Zustand.
- Add login screen.
- Add logout action that clears SecureStore tokens.
- Add `/auth/me` hydration on app start.
- Add protected-route behavior.

Acceptance:

- User can log in on Android.
- Tokens are stored in SecureStore.
- App reload keeps the user signed in.
- `/auth/me` works from mobile with a Bearer token.
- Invalid/expired access token triggers refresh when possible.
- Logout clears local mobile session.

---

## Phase 3 - API Client and Shared Types

Goal: create the mobile data foundation.

Tasks:

- Add `mobile/src/lib/api.ts`.
- Read API base URL from `EXPO_PUBLIC_API_URL`.
- Attach Bearer token automatically.
- Parse Echo/Navisha errors into a typed mobile `ApiError`.
- Add refresh-on-401 behavior.
- Add TanStack Query client defaults.
- Add domain types:
  - user
  - trip
  - day
  - activity
  - expense
  - currency
  - transportation
  - accommodation
- Add small formatting helpers:
  - date
  - date range
  - currency
- Add unit tests for API client behavior and formatting helpers.

Acceptance:

- Mobile hooks can call protected endpoints through one API wrapper.
- API errors render meaningful messages.
- Token refresh behavior is covered by tests.

---

## Phase 4 - Trips

Goal: implement trip list and trip detail workflows.

Tasks:

- Add `useTrips`.
- Add `useTrip`.
- Add `useCreateTrip`.
- Add `useUpdateTrip`.
- Add `useDeleteTrip`.
- Build trip list screen.
- Build trip detail screen.
- Build create trip form.
- Build edit trip form.
- Add loading, empty, error, and success states.
- Add pull-to-refresh on trip list.
- Add tests for trip list and form validation.

Acceptance:

- User can list trips.
- User can open trip detail.
- User can create a trip.
- User can edit trip metadata.
- User can delete a trip after confirmation.

---

## Phase 5 - Itinerary

Goal: implement day-by-day itinerary management.

Tasks:

- Add `useDayActivities`.
- Add `useCreateActivity`.
- Add `useUpdateActivity`.
- Add `useDeleteActivity`.
- Render day tabs or a day selector.
- Render activity cards.
- Add activity form for:
  - location
  - note
  - todo
- Add edit activity flow.
- Add delete confirmation.
- Add day notes if the existing API is ready.
- Defer drag-and-drop reorder if it makes the first pass too large.
- Add simple reorder later with explicit up/down controls or a native drag list.

Acceptance:

- User can view activities by day.
- User can add, edit, and delete activities.
- Location activities preserve coordinates and Google Place ID when available.
- Note and todo activities render correctly.

---

## Phase 6 - Budget

Goal: implement mobile budget basics.

Tasks:

- Add `useExpenses`.
- Add `useExpenseSummary`.
- Add `useCreateExpense`.
- Add `useUpdateExpense`.
- Add `useDeleteExpense`.
- Build expense list.
- Build expense form.
- Build budget summary card.
- Support category selection.
- Support supported currency selection.
- Show converted amount and trip base currency where available.
- Add tests for validation and currency formatting.

Acceptance:

- User can view expenses for a trip.
- User can add, edit, and delete expenses.
- Budget summary loads and shows total spend by category.
- Unsupported or missing currency is handled gracefully.

---

## Phase 7 - Maps

Goal: support Google Maps handoff without embedding a native map yet.

Tasks:

- Add `mobile/src/lib/maps-url.ts`.
- Port or mirror existing web map URL helpers.
- Open a single location in Google Maps.
- Open a day route in Google Maps.
- Open a full trip route in Google Maps.
- Add fallback to Google Maps search when coordinates are missing.
- Add tests for URL helper edge cases.

Later:

- Add native embedded map with `react-native-maps`.
- Add marker selection.
- Add route preview.

Acceptance:

- User can open one place externally.
- User can open a route externally.
- Missing coordinates do not break the action.

---

## Phase 8 - Testing and Release Prep

Goal: make the app reliable enough for internal testing.

Tasks:

- Expand Jest coverage for API client, auth, trip, itinerary, budget, and map helpers.
- Add Maestro smoke flows:
  - app launches
  - login screen appears
  - trip list appears for an authenticated test state
  - trip detail opens
  - budget screen opens
- Build Android development build.
- Test against local backend.
- Deploy backend mobile auth endpoints.
- Smoke test against `https://api.navisha.cloud`.
- Document known limitations.
- Add release checklist for Android internal testing.

Acceptance:

- Android development build installs on emulator or device.
- Local backend smoke flow passes.
- Production API smoke flow passes after backend deploy.
- Known limitations are documented before broader testing.

---

## Cross-Phase Rules

- Prefer local backend while backend/mobile contracts are changing.
- Keep web OAuth behavior working.
- Keep existing REST endpoints shared between web and mobile.
- Add mobile-specific API only for auth unless a business endpoint truly needs a different shape.
- Store mobile tokens in SecureStore, not AsyncStorage.
- Use Bearer tokens from mobile, not cookies.
- Do not require CSRF headers from mobile Bearer-token requests.
- Add tests in the same phase as risky auth/API behavior.

---

## References

- Expo auth guide: https://docs.expo.dev/guides/authentication/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo Jest setup: https://docs.expo.dev/develop/unit-testing/
- React Native Windows setup: https://reactnative.dev/docs/set-up-your-environment
- Google native OAuth: https://developers.google.com/identity/protocols/oauth2/native-app
