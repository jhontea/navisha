/**
 * Optional error reporting to Sentry. Off unless NEXT_PUBLIC_SENTRY_DSN is set
 * at build time; the Sentry SDK is then loaded on demand, so it costs nothing
 * when disabled. No personal data, request bodies or tracing are sent.
 */

type Sentry = typeof import("@sentry/browser")

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? ""

let sdk: Promise<Sentry> | null = null

/** Share links carry a secret token in the path; never send it. */
export function scrubUrl(url: string): string {
  return url.replace(/\/share\/[^/?#]+/g, "/share/[token]")
}

export function initErrorReporting() {
  if (!DSN || typeof window === "undefined" || sdk) return
  sdk = import("@sentry/browser").then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? "production",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request?.url) event.request.url = scrubUrl(event.request.url)
        return event
      },
      beforeBreadcrumb(crumb) {
        for (const key of ["url", "from", "to"] as const) {
          const value = crumb.data?.[key]
          if (typeof value === "string") crumb.data![key] = scrubUrl(value)
        }
        return crumb
      },
    })
    return Sentry
  })
}

/** Report an error caught by the app (error boundary). No-op when disabled. */
export function reportError(error: unknown) {
  if (!DSN) return
  initErrorReporting()
  void sdk?.then((Sentry) => Sentry.captureException(error))
}
