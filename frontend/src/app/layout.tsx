import type { Metadata } from "next"
import localFont from "next/font/local"
import { Providers } from "@/components/providers"
import "./globals.css"
import "maplibre-gl/dist/maplibre-gl.css"

const inter = localFont({
  src: [
    {
      path: "./fonts/InterVariable.woff2",
      style: "normal",
    },
    {
      path: "./fonts/InterVariableItalic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
})

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
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
        className={`${inter.variable} ${geistSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
