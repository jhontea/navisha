import type { Metadata } from "next"
import localFont from "next/font/local"
import { ErrorReporting } from "@/components/ErrorReporting"
import { WebVitalsReporter } from "@/components/WebVitalsReporter"
import "./globals.css"

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
})

const interItalic = localFont({
  src: "./fonts/InterVariableItalic.woff2",
  variable: "--font-inter-italic",
  display: "swap",
  style: "italic",
  weight: "100 900",
  preload: false,
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
    <html lang="en">
      <head />
      <body
        className={`${inter.variable} ${interItalic.variable} font-sans antialiased`}
      >
        <WebVitalsReporter />
        <ErrorReporting />
        {children}
      </body>
    </html>
  )
}
