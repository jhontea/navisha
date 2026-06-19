type FeatureCardProps = {
  icon: string
  title: string
  description: string
  visual?: React.ReactNode
  className?: string
}

export function FeatureCard({ icon, title, description, visual, className = "" }: FeatureCardProps) {
  return (
    <div className={`group relative overflow-hidden bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 ${className}`}>
      <div className="relative z-10">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined" data-icon={icon}>{icon}</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">{title}</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-8">{description}</p>
      </div>
      {visual && <div className="relative z-10">{visual}</div>}
    </div>
  )
}
