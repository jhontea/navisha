import { Plane, Hotel, UtensilsCrossed, Sparkles, Wallet, CalendarDays, Laptop, LogIn, MapPin } from "lucide-react"
import { FeatureCard } from "@/components/landing/FeatureCard"

const itineraryVisual = (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between px-1">
      <div>
        <p className="text-xs font-semibold text-foreground">Day 3 · Tokyo</p>
        <p className="text-[10px] text-muted-foreground">Wednesday, Dec 22</p>
      </div>
      <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
        3 activities
      </span>
    </div>

    <div className="relative space-y-2">
      {[
        { Icon: Plane, time: "08:00", label: "Flight to Tokyo", meta: "2h 15m", color: "bg-primary/10 text-primary" },
        { Icon: Hotel, time: "14:00", label: "Check-in Shinjuku", meta: "Hotel", color: "bg-chromatic-ocean/10 text-chromatic-ocean" },
        { Icon: UtensilsCrossed, time: "19:00", label: "Dinner at Ichiran", meta: "Restaurant", color: "bg-chromatic-aurora/10 text-chromatic-aurora" },
      ].map((activity) => (
        <div key={activity.label} className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/55 p-2.5 shadow-sm">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.color}`}>
            <activity.Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{activity.label}</p>
            <p className="text-[10px] text-muted-foreground">{activity.meta}</p>
          </div>
          <time className="text-[10px] font-semibold tabular-nums text-muted-foreground">{activity.time}</time>
        </div>
      ))}
    </div>
  </div>
)

const budgetVisual = (
  <div className="space-y-3">
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">Budget remaining</p>
        <p className="font-heading text-2xl font-bold tabular-nums text-foreground">¥142,000</p>
      </div>
      <span className="rounded-full border border-chromatic-ocean/20 bg-chromatic-ocean/10 px-2.5 py-1 text-xs font-semibold text-chromatic-ocean">
        68% left
      </span>
    </div>

    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-chromatic-ocean to-primary transition-all duration-700" />
    </div>

    <div className="grid grid-cols-3 gap-2 pt-1">
      {[
        { label: "Transport", value: "30%", color: "bg-primary" },
        { label: "Food", value: "25%", color: "bg-chromatic-ocean" },
        { label: "Hotels", value: "45%", color: "bg-chromatic-aurora" },
      ].map((category) => (
        <div key={category.label} className="rounded-xl border border-white/40 bg-white/55 p-2 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${category.color}`} aria-hidden="true" />
            <span className="truncate text-[10px] text-muted-foreground">{category.label}</span>
          </div>
          <p className="text-xs font-semibold tabular-nums text-foreground">{category.value}</p>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-xs shadow-sm">
      <span className="font-medium text-foreground">JPY</span>
      <span className="text-chromatic-ocean" aria-hidden="true">⇄</span>
      <span className="font-medium text-foreground">IDR</span>
    </div>
  </div>
)

const aiVisual = (
  <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
    <div className="flex flex-col rounded-2xl border border-white/40 bg-white/55 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trip request</p>
        <Sparkles className="h-3.5 w-3.5 text-chromatic-aurora" aria-hidden="true" />
      </div>

      <p className="flex-1 rounded-xl border border-border/50 bg-white/70 p-3 text-xs leading-relaxed text-foreground">
        Plan a 7-day trip to Kyoto and Osaka focused on culture and local food.
      </p>

      <div className="my-2.5 flex flex-wrap gap-1.5">
        {["7 days", "Culture", "Local food"].map((preference) => (
          <span key={preference} className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
            {preference}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-chromatic-aurora px-3 py-2 text-[10px] font-semibold text-white shadow-sm">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Generate itinerary
      </div>
    </div>

    <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Generated plan</p>
          <p className="text-[10px] text-muted-foreground">Kyoto → Osaka</p>
        </div>
        <span className="rounded-full bg-chromatic-ocean/10 px-2 py-1 text-[10px] font-semibold text-chromatic-ocean">Ready</span>
      </div>

      <div className="space-y-2">
        {[
          { day: "01", title: "Fushimi Inari", detail: "Nishiki Market · Tea ceremony" },
          { day: "02", title: "Arashiyama", detail: "Bamboo forest · Kinkaku-ji" },
          { day: "03", title: "Osaka food tour", detail: "Dotonbori · Kuromon Market" },
        ].map((item) => (
          <div key={item.day} className="flex items-center gap-2.5 rounded-xl border border-white/50 bg-white/65 p-2 shadow-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
              {item.day}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-foreground">{item.title}</p>
              <p className="truncate text-[9px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-center text-[9px] font-medium text-primary">+ 4 more days prepared</p>
    </div>
  </div>
)

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-max-width px-margin-mobile py-16 md:px-margin-desktop" aria-labelledby="features-heading">
      {/* Section header */}
      <div className="text-center mb-14">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Everything you need</p>
        <h2 id="features-heading" className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Travel planning, <span className="text-gradient-ocean">reimagined</span>
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          From your first idea to your last souvenir — Navisha keeps your journey organized and stress-free.
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children animate-fade-in-up">
        {/* Wide card — AI */}
        <FeatureCard
          Icon={Sparkles}
          title="AI Trip Generator"
          description="Describe your dream trip in plain text. Our AI builds a complete day-by-day itinerary in seconds, including activities, restaurants, and local tips."
          visual={aiVisual}
          className="md:col-span-2"
          accent="aurora"
        />

        {/* Budget */}
        <FeatureCard
          Icon={Wallet}
          title="Smart Budget Tracking"
          description="Track spending in any currency with real-time conversion. Know exactly where your money goes."
          visual={budgetVisual}
          accent="ocean"
        />

        {/* Itinerary */}
        <FeatureCard
          Icon={CalendarDays}
          title="Day-by-Day Itinerary"
          description="Organize flights, hotels, activities, and meals into a clean timeline. Every detail, one place."
          visual={itineraryVisual}
          accent="primary"
        />

        {/* Wide card — Cross-device */}
        <div className="md:col-span-2 relative overflow-hidden bg-on-primary-fixed rounded-3xl p-10 min-h-[280px] group">
          {/* Animated background dots */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 mb-6">
              <Laptop className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white mb-3">
              Your plans, everywhere you go
            </h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Access your itinerary on any device. Works offline so you always have your plans — even deep in the mountains.
            </p>
          </div>

          {/* Floating device mockup */}
          <div className="absolute right-6 top-8 hidden lg:block animate-float" aria-hidden="true">
            <div className="glass-card rounded-2xl border border-white/15 shadow-xl p-4 w-48">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-white/20" />
                <div className="h-2.5 bg-white/20 rounded w-20" />
              </div>
              <div className="h-16 bg-white/10 rounded-xl mb-3" />
              <div className="space-y-2">
                <div className="h-2 bg-white/15 rounded w-full" />
                <div className="h-2 bg-white/15 rounded w-4/5" />
                <div className="h-2 bg-white/10 rounded w-3/5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works — numbered steps */}
      <div id="how-it-works" className="mt-16 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Up and running in minutes
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            No complex setup. Just sign in and start planning.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              Icon: LogIn,
              title: "Sign in with Google",
              desc: "One click, no forms, no password to remember. Secure OAuth login.",
            },
            {
              step: "02",
              Icon: Sparkles,
              title: "Describe your trip",
              desc: "Tell the AI where you want to go, or build your itinerary manually step by step.",
            },
            {
              step: "03",
              Icon: MapPin,
              title: "Go explore",
              desc: "Your trip is ready. Share it, export it, track your budget, and enjoy the journey.",
            },
          ].map((item) => (
            <li key={item.step} className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <item.Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white bg-primary rounded-full h-5 w-5 flex items-center justify-center shadow-sm" aria-label={`Step ${item.step.slice(-1)}`}>
                  {item.step.slice(-1)}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
