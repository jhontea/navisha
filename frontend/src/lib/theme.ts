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

/**
 * Browser/status bar colour (meta theme-color, e.g. the Android status bar of
 * the installed app): the page background, so the bar blends into the app.
 */
export const THEME_COLOR = { light: "#F3F7FD", dark: "#121A2B" } as const // ds-allow-hardcode: meta tag needs literals; --background tokens

/**
 * Runs in <head> before first paint; keep it tiny and dependency-free. Applies
 * the dark class, then keeps every theme-color tag (Next also streams one in
 * after hydration into <head>) on the current theme's colour.
 */
export const THEME_INIT_SCRIPT = `try{var d=document.documentElement;if(${DARK_COOKIE}.test(document.cookie))d.classList.add("dark");var s=function(){var c=d.classList.contains("dark")?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){if(m.content!==c)m.content=c})};s();var o=new MutationObserver(s);o.observe(document.head,{childList:true});o.observe(d,{attributes:true,attributeFilter:["class"]})}catch(e){}`

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}
