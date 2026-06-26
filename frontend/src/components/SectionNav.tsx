"use client"

import { cn } from "@/lib/utils"

interface SectionNavProps {
  sections: { id: string; label: string; icon?: React.ReactNode }[]
  activeSection: string
  onSectionChange: (id: string) => void
  className?: string
}

export function SectionNav({ sections, activeSection, onSectionChange, className }: SectionNavProps) {
  return (
    <div className={cn("sticky top-16 z-30 -mx-4 overflow-x-auto px-4 py-3 md:top-20", className)}>
      <div className="glass mx-auto flex w-fit gap-1 rounded-2xl p-1">
        {sections.map((section) => {
          const isActive = section.id === activeSection
          return (
            <button key={section.id} type="button" onClick={() => onSectionChange(section.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive ? "bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
              )}>
              {section.icon}{section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
