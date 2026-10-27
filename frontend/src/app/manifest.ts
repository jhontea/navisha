import type { MetadataRoute } from "next"

// Colors are the light-theme tokens in globals.css: --primary (#3673DB) and --background (#F3F7FD).
// Light is the app default and the dark theme is a cookie choice, so the splash stays light.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Navisha — Travel Planner",
    short_name: "Navisha",
    description: "Plan each day, see it on a map, and track spending in your currency.",
    id: "/trips",
    start_url: "/trips",
    scope: "/",
    display: "standalone",
    theme_color: "#3673DB",
    background_color: "#F3F7FD",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
