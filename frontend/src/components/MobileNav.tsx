"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  Compass,
  LayoutDashboard,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Item {
  label: string
  href: string
  icon: typeof LayoutDashboard
  disabled?: boolean
}

const ITEMS: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Explore", href: "#", icon: Compass, disabled: true },
  { label: "Converter", href: "/currency", icon: ArrowLeftRight },
  { label: "Profile", href: "#", icon: User, disabled: true },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background px-6 py-3 md:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        const cls = cn(
          "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
          active
            ? "text-primary"
            : item.disabled
              ? "text-muted-foreground/40"
              : "text-muted-foreground",
        )
        if (item.disabled) {
          return (
            <span key={item.label} className={cls}>
              <Icon className="h-5 w-5" />
              {item.label}
            </span>
          )
        }
        return (
          <Link key={item.href} href={item.href} className={cls}>
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
