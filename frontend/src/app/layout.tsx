import type { Metadata } from "next"
import localFont from "next/font/local"
import { Providers } from "@/components/providers"
import "./globals.css"

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
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${inter.variable} ${geistSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
