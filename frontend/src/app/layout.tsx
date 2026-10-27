import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { ErrorReporting } from "@/components/ErrorReporting"
import { WebVitalsReporter } from "@/components/WebVitalsReporter"
import { THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme"
import "./globals.css"

// docs/DESIGN.md §3: Nunito for display (titles, big numbers), Nunito Sans for
// UI. Self-hosted from @fontsource-variable (OFL) so builds never depend on
// fetching Google Fonts at build time (that fetch broke the CI build).
const display = localFont({
  src: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  weight: "200 1000",
  variable: "--font-display",
  display: "swap",
})

const sans = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2",
      weight: "200 1000",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-italic.woff2",
      weight: "200 1000",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Navisha — Travel Planner",
    template: "%s | Navisha",
  },
  description:
    "Plan each day, see it on a map, and track spending in your currency. Build day-by-day itineraries with flights and hotels, or let AI draft a trip for you to review.",
  keywords: ["travel", "itinerary", "trip planner", "budget tracker", "AI travel"],
  openGraph: {
    title: "Navisha — Travel Planner",
    description: "Plan each day, see it on a map, and track spending in your currency.",
    type: "website",
  },
  // iOS takes its home-screen icon from apple-icon.png in this folder, not from the manifest.
  appleWebApp: { capable: true, title: "Navisha", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR.light, // dark mode swaps it in lib/theme.ts
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The theme script may add `dark` before React hydrates.
    <html lang="en" className={`${display.variable} ${sans.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <WebVitalsReporter />
        <ErrorReporting />
        {children}
      </body>
    </html>
  )
}
