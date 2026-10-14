"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { SegmentedControl } from "@/components/SegmentedControl"
import { applyTheme, readTheme, type Theme } from "@/lib/theme"

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
]

/** Light / Dark switch. Light is the default; the choice is remembered in a cookie. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => setTheme(readTheme()), [])

  return (
    <SegmentedControl
      aria-label="Theme"
      options={OPTIONS}
      value={theme}
      onChange={(next) => {
        applyTheme(next)
        setTheme(next)
      }}
      className={className}
    />
  )
}
