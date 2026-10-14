/**
 * Colour theme. Light is the default for everyone; dark is opt-in and does
 * not follow the OS setting (docs/DESIGN.md §11). The choice lives in a
 * cookie so the inline script in the root layout can apply it before paint.
 */
export type Theme = "light" | "dark"

export const THEME_COOKIE = "navisha-theme"

const ONE_YEAR = 60 * 60 * 24 * 365

const DARK_COOKIE = new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=dark(?:;|$)`)

/** True when the cookie string opts into the dark theme. */
export function cookieWantsDark(cookie: string): boolean {
  return DARK_COOKIE.test(cookie)
}

/** Runs in <head> before first paint; keep it tiny and dependency-free. */
export const THEME_INIT_SCRIPT = `try{if(${DARK_COOKIE}.test(document.cookie))document.documentElement.classList.add("dark")}catch(e){}`

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}
