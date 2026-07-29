# Landing & Login Improvement Plan

## Baseline and current result (production build, 29 July 2026)

| Route | Baseline route JS | Current route JS | Baseline first load | Current first load |
| --- | ---: | ---: | ---: | ---: |
| `/` | 6.0 kB | 2.13 kB | 117 kB | 114 kB |
| `/login` | 2.09 kB | 1.30 kB | 104 kB | 103 kB |

Completed:

- Landing hero is server-rendered and has an explicit responsive image size.
- Navbar hydration is limited to the mobile menu client island.
- Below-the-fold feature and CTA sections use deferred rendering.
- OAuth starts from a normal link and works without client JavaScript.
- The desktop login illustration is no longer requested on mobile.
- Animated blur work is reduced for coarse-pointer/mobile devices.
- Native `sharp` image optimization is installed for the standalone build.
- Browser verification measured a 21 kB WebP landing image on mobile and a
  75 kB WebP login illustration on desktop.

The source illustrations remain approximately 1 MB each, but they are build
inputs rather than browser payloads. Runtime delivery now uses responsive WebP
variants, so replacing the masters is optional rather than latency-critical.

## Phase 1 — Landing page loading and mobile rendering

1. Convert `HeroSection` back to a Server Component; it has no state, effects,
   or browser-only APIs. Keep only the mobile navigation controls as a small
   client island.
2. Add an explicit responsive `sizes` value to the hero image and retain
   priority only while field data confirms it is the LCP element.
3. Export compressed WebP/AVIF illustration masters and compare visual quality
   at 1x and 2x DPR before replacing the PNG sources.
4. Apply `content-visibility: auto` with appropriate intrinsic sizes to the
   below-the-fold feature and CTA sections, reducing initial layout/paint work
   on Android and iOS without changing their content.
5. Reduce large animated blur layers for coarse-pointer/reduced-motion devices;
   preserve the current visual design on capable desktop devices.

Acceptance criteria:

- No hydration for the hero content.
- Landing First Load JS is lower than the 117 kB baseline.
- No image larger than the rendered width × device DPR is requested.
- No new CLS; field p75 LCP improves or remains within the `good` threshold.

## Phase 2 — Login page loading and OAuth path

1. Replace the JavaScript-only Google login button with a normal server-rendered
   anchor to the OAuth endpoint. It performs the same full-page navigation and
   removes the login page's only required interaction bundle.
2. Stop preloading the desktop-only illustration on mobile. Serve it through a
   breakpoint-aware source/background strategy, and preload only at `lg` and
   above if it remains the desktop LCP element.
3. Replace the 1.02 MB PNG master with visually verified WebP/AVIF variants and
   provide desktop-specific dimensions.
4. Simplify or disable the fixed 120–150 px animated blur layers on low-power
   and reduced-motion devices to lower GPU/compositing cost.
5. Keep error/session-expired messages server-rendered from `searchParams`; do
   not add a client auth check or blocking backend round trip before first paint.

Acceptance criteria:

- Login can start OAuth with JavaScript disabled.
- Mobile does not request or preload the desktop illustration.
- Login First Load JS is lower than the 104 kB baseline.
- OAuth error and session-expired states remain unchanged and accessible.

## Phase 3 — Measurement and rollout

1. Deploy behind the normal staging/release path and compare the newly added
   `web_vital` logs by normalized route, metric, and rating.
2. Test cold and warm navigations on desktop Chrome, Android Chrome with a
   constrained network/CPU profile, and iOS Safari.
3. Compare p75 LCP, INP, and CLS for seven days before and after rollout. Roll
   back individual visual optimizations if they regress conversion or layout.
4. Add a lightweight CTA-to-OAuth-start event only if product analytics is
   available; never block navigation on analytics delivery.

## Recommended execution order

1. Login anchor and mobile illustration loading.
2. Landing hero server conversion and image sizing.
3. Below-fold rendering and reduced-motion/GPU refinements.
4. Cross-device visual QA, Web Vitals comparison, and copy/SEO review.
