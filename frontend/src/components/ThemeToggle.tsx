"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"

import { SegmentedControl } from "@/components/SegmentedControl"
import { applyTheme, readTheme, type Theme } from "@/lib/theme"

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
]

/** The theme lives on `<html class="dark">`; watch that attribute for changes. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

/** Light / Dark switch. Light is the default; the choice is remembered in a cookie. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => "light")

  return (
    <SegmentedControl
      aria-label="Theme"
      options={OPTIONS}
      value={theme}
      onChange={(next) => applyTheme(next)}
      className={className}
    />
  )
}
