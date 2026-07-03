# Mobile Plan

This plan defines the recommended architecture and MVP scope for the Navisha mobile app.

---

## Goal

Build a native mobile app for Navisha using the existing Go backend API.

The mobile app should feel like a focused travel companion, not a wrapper around the current Next.js app. The existing web UI is mobile-first, but native mobile still needs its own navigation, token storage, Google login flow, and device-aware behavior.

---

## Chosen Stack

- Expo React Native
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- `expo-secure-store`
- `expo-auth-session` or a native Google Sign-In library
- Jest with `jest-expo`
- React Native Testing Library
- Maestro for Android E2E smoke tests

Use Expo development builds for the normal development workflow. Expo Go can be used only for early UI spikes that do not need custom OAuth redirect schemes or native modules.

---

## App Identity Defaults

These defaults are locked for the first mobile implementation:

| Item | Value |
|------|-------|
| Android package name | `cloud.navisha.mobile` |
| iOS bundle ID | `cloud.navisha.mobile` |
| App scheme | `navisha` |
| Primary local target | Android on Windows |
| Default development API | Local backend via LAN IP |

Production API smoke testing uses `https://api.navisha.cloud/api/v1` only after the mobile auth endpoints are deployed.

---

## MVP Scope

Mobile v1 should cover the core trip workflow:

- Google login
- current user hydration
- trip list
- trip detail
- create, edit, and delete trips
- day-by-day itinerary view
- add, edit, and delete activities
- budget basics
- expense list
- expense form
- budget summary
- open single locations in Google Maps
- open day or trip route in Google Maps

Out of scope for the first mobile pass:

- full web feature parity
- AI trip generation
- AI trip summary
- native embedded map
- drag-and-drop activity reorder
- offline-first sync
- push notifications
- iOS local development on Windows

Those can be added after the auth, API client, and core trip screens are stable.

---

## Architecture

Use a feature-slice structure similar to the web app, but do not import Next.js components into mobile.

Expected shape:

```text
mobile/
|-- app/
|   |-- _layout.tsx
|   |-- index.tsx
|   |-- login.tsx
|   `-- trips/
|       |-- index.tsx
|       `-- [id].tsx
|-- src/
|   |-- components/
|   |   `-- ui/
|   |-- features/
|   |   |-- auth/
|   |   |-- trip/
|   |   |-- activity/
|   |   |-- expense/
|   |   |-- currency/
|   |   `-- map/
|   `-- lib/
|       |-- api.ts
|       |-- auth-token.ts
|       |-- query-client.ts
|       `-- maps-url.ts
|-- .env.example
|-- app.json
|-- package.json
`-- tsconfig.json
```

Keep `app/` route files thin. Screens should compose feature components and hooks from `src/features`.

State split:

- Server state: TanStack Query
- Session state: Zustand
- Secure token persistence: `expo-secure-store`
- Form state: React Hook Form
- Validation: Zod

---

## API Client

Mobile should use a dedicated API wrapper:

```text
mobile/src/lib/api.ts
```

Responsibilities:

- read `EXPO_PUBLIC_API_URL`
- attach `Authorization: Bearer <access_token>` when present
- parse Navisha/Echo error responses consistently
- refresh token on `401` when possible
- expose typed `get`, `post`, `put`, and `delete` helpers

Mobile token storage should live in:

```text
mobile/src/lib/auth-token.ts
```

Responsibilities:

- store access token
- store refresh token
- clear both tokens on logout
- expose a small API used by the API client and auth feature

Do not use browser cookies or CSRF headers in the mobile client.

---

## Auth Architecture

Web auth remains cookie-based:

- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- httpOnly `access_token` and `refresh_token` cookies

Mobile auth should be token-based:

- `POST /api/v1/auth/google/mobile`
- `POST /api/v1/auth/refresh/mobile`
- `POST /api/v1/auth/logout` can remain best-effort client-side token clearing unless server-side refresh-token revocation is added later
- `GET /api/v1/auth/me` should work with `Authorization: Bearer <access_token>`, which the backend already supports in auth middleware

Mobile login response shape:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "Ahmad Hafizh",
    "avatar_url": "https://..."
  },
  "access_token": "navisha-access-token",
  "refresh_token": "navisha-refresh-token"
}
```

Refresh response shape:

```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token"
}
```

CSRF should be skipped for mobile Authorization-header requests. CSRF exists for browser cookie protection; native mobile requests explicitly attach Bearer tokens.

---

## Maps

Mobile v1 should open Google Maps externally instead of embedding a native map.

Reasons:

- smaller first implementation
- fewer native dependencies
- matches existing web helper behavior
- works well for travel route handoff

Initial map capabilities:

- open a single activity location
- open day route
- open full trip route
- fallback to Google Maps search when coordinates are missing

Native map embed can be added later with `react-native-maps` after the core workflow is reliable.

---

## API Compatibility

Reuse existing REST endpoints for trip, activity, expense, currency, transportation, and accommodation.

Only add mobile-specific auth endpoints at first:

- `POST /api/v1/auth/google/mobile`
- `POST /api/v1/auth/refresh/mobile`

Avoid creating mobile-only variants of business endpoints unless the response shape is genuinely unsuitable for mobile.

When using `https://api.navisha.cloud`, the mobile app must match the deployed API version. During active mobile development, local backend should remain the default because backend and mobile changes will move together.

---

## References

- Expo auth guide: https://docs.expo.dev/guides/authentication/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo Jest setup: https://docs.expo.dev/develop/unit-testing/
- React Native Windows setup: https://reactnative.dev/docs/set-up-your-environment
- Google native OAuth: https://developers.google.com/identity/protocols/oauth2/native-app
