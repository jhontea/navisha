import type { Metadata } from "next"
import { Nunito, Nunito_Sans } from "next/font/google"
import { ErrorReporting } from "@/components/ErrorReporting"
import { WebVitalsReporter } from "@/components/WebVitalsReporter"
import { THEME_INIT_SCRIPT } from "@/lib/theme"
import "./globals.css"

// docs/DESIGN.md §3: Nunito for display (titles, big numbers), Nunito Sans for UI.
const display = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
})

const sans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The theme script may add `dark` before React hydrates.
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
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
