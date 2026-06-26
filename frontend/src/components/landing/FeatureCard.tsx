import type { LucideIcon } from "lucide-react"

type FeatureCardProps = {
  Icon: LucideIcon
  title: string
  description: string
  visual?: React.ReactNode
  className?: string
  accent?: "primary" | "ocean" | "aurora"
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  ocean: "bg-chromatic-ocean/10 text-chromatic-ocean",
  aurora: "bg-chromatic-aurora/10 text-chromatic-aurora",
}

export function FeatureCard({
  Icon,
  title,
  description,
  visual,
  className = "",
  accent = "primary",
}: FeatureCardProps) {
  return (
    <div
      className={`glass group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:shadow-chromatic hover:-translate-y-1.5 focus-within:ring-2 focus-within:ring-primary/30 ${className}`}
    >
      {/* Subtle hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl bg-gradient-to-br from-white/8 to-transparent" aria-hidden="true" />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110 ${accentMap[accent]}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3 className="font-heading text-headline-sm text-foreground mb-3">{title}</h3>
        <p className="text-body-md text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {visual && (
        <div className="relative z-10 mt-6">{visual}</div>
      )}
    </div>
  )
}
