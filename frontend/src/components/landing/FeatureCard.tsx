type FeatureCardProps = {
  icon: string
  title: string
  description: string
  visual?: React.ReactNode
  className?: string
}

export function FeatureCard({ icon, title, description, visual, className = "" }: FeatureCardProps) {
  return (
    <div className={`glass group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:bg-white/25 hover:shadow-chromatic ${className}`}>
      <div className="relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
          <span className="material-symbols-outlined" data-icon={icon}>{icon}</span>
        </div>
        <h3 className="font-heading text-headline-sm text-foreground mb-3">{title}</h3>
        <p className="text-body-md text-muted-foreground max-w-sm mb-8">{description}</p>
      </div>
      {visual && <div className="relative z-10">{visual}</div>}
    </div>
  )
}
