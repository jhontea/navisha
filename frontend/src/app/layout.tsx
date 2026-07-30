import type { Metadata } from "next"
import localFont from "next/font/local"
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
    "Plan your journey, build day-by-day itineraries, track your budget, and explore the world with AI-powered trip planning.",
  keywords: ["travel", "itinerary", "trip planner", "budget tracker", "AI travel"],
  openGraph: {
    title: "Navisha — Travel Planner",
    description: "Plan your journey. Own your adventure.",
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
        {children}
      </body>
    </html>
  )
}
