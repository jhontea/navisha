import { FeatureCard } from "@/components/landing/FeatureCard"

const planningVisual = (
  <div className="absolute -right-8 -bottom-8 w-1/2 h-64 bg-surface-container rounded-tl-3xl border border-outline-variant p-4 rotate-2 group-hover:rotate-0 transition-transform duration-500 hidden md:block">
    <div className="flex flex-col gap-3">
      <div className="h-8 bg-white rounded-lg w-full flex items-center px-3 gap-2">
        <div className="w-2 h-2 bg-primary rounded-full" />
        <div className="h-2 bg-surface-variant rounded w-1/2" />
      </div>
      <div className="h-8 bg-white rounded-lg w-3/4 flex items-center px-3 gap-2">
        <div className="w-2 h-2 bg-tertiary rounded-full" />
        <div className="h-2 bg-surface-variant rounded w-2/3" />
      </div>
      <div className="h-8 bg-white rounded-lg w-full flex items-center px-3 gap-2">
        <div className="w-2 h-2 bg-secondary rounded-full" />
        <div className="h-2 bg-surface-variant rounded w-1/3" />
      </div>
    </div>
  </div>
)

const budgetVisual = (
  <div className="p-4 bg-budget-green/30 rounded-2xl flex items-end justify-between">
    <div>
      <div className="text-xs text-on-surface-variant">Remaining</div>
      <div className="text-xl font-headline font-headline-sm font-bold text-on-surface">$1,420</div>
    </div>
    <div className="w-12 h-1 bg-on-surface-variant/10 rounded-full overflow-hidden">
      <div className="w-2/3 h-full bg-primary" />
    </div>
  </div>
)

const itineraryVisual = (
  <div className="space-y-2">
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-container-low border border-outline-variant/10">
      <span className="material-symbols-outlined text-[16px] text-primary">directions_bus</span>
      <span className="text-label-sm font-medium">10:00 AM • Tokyo Metro</span>
    </div>
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-container-low border border-outline-variant/10">
      <span className="material-symbols-outlined text-[16px] text-primary">restaurant</span>
      <span className="text-label-sm font-medium">01:30 PM • Ichiran Ramen</span>
    </div>
  </div>
)

export function FeatureGrid() {
  return (
    <section className="py-12 md:py-24 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard icon="explore" title="Intelligent Trip Planning" description="Map out your entire journey with our drag-and-drop builder. Connect flights, stays, and activities seamlessly." visual={planningVisual} className="md:col-span-2" />
        <FeatureCard icon="payments" title="Budget Tracking" description="Keep your finances in check with real-time currency conversion and category breakdowns." visual={budgetVisual} />
        <FeatureCard icon="event_note" title="Itinerary Management" description="Every detail of your day, from hotel check-ins to restaurant reservations, organized beautifully." visual={itineraryVisual} />
        <div className="md:col-span-2 relative overflow-hidden bg-on-primary-fixed rounded-3xl p-10 min-h-[400px]">
          <div className="relative z-20 flex flex-col h-full justify-center">
            <h2 className="text-on-primary font-display text-headline-lg mb-4">All your travel plans in your pocket.</h2>
            <p className="text-on-primary-fixed-variant text-body-lg max-w-md">
              Navisha works across all your devices, ensuring you have your itinerary even when you&apos;re offline in the middle of a trek.
            </p>
          </div>
          <div className="absolute right-[-10%] top-20 w-[400px] h-[600px] glass-card rounded-3xl border border-white/20 shadow-2xl p-6 hidden lg:block animate-float">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary-container" />
              <div className="h-4 bg-on-surface/10 rounded w-1/3" />
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-surface-container-high rounded-2xl" />
              <div className="space-y-4">
                <div className="h-3 bg-on-surface/5 rounded w-full" />
                <div className="h-3 bg-on-surface/5 rounded w-5/6" />
                <div className="h-3 bg-on-surface/5 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
