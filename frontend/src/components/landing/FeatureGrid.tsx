import { Plane, Hotel, UtensilsCrossed, Sparkles, Wallet, CalendarDays, Laptop, LogIn, MapPin } from "lucide-react"
import { FeatureCard } from "@/components/landing/FeatureCard"

const itineraryVisual = (
  <div className="space-y-2">
    {[
      { Icon: Plane, time: "08:00", label: "Flight to Tokyo", color: "text-primary" },
      { Icon: Hotel, time: "14:00", label: "Check-in Shinjuku Hotel", color: "text-chromatic-ocean" },
      { Icon: UtensilsCrossed, time: "19:00", label: "Dinner at Ichiran Ramen", color: "text-chromatic-aurora" },
    ].map((item) => (
      <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-white/40 shadow-sm">
        <item.Icon className={`h-5 w-5 shrink-0 ${item.color}`} aria-hidden="true" />
        <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">{item.time}</span>
        <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
      </div>
    ))}
  </div>
)

const budgetVisual = (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
      <div>
        <p className="text-xs text-muted-foreground">Budget remaining</p>
        <p className="text-2xl font-bold text-foreground tabular-nums font-heading">¥142,000</p>
      </div>
      <span className="text-xs font-semibold text-chromatic-ocean bg-chromatic-ocean/10 px-2.5 py-1 rounded-full border border-chromatic-ocean/20">68% left</span>
    </div>
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-chromatic-ocean to-primary transition-all duration-700" />
    </div>
    <div className="grid grid-cols-3 gap-2 pt-1">
      {[
        { label: "Transport", pct: "30%", color: "bg-primary" },
        { label: "Food", pct: "25%", color: "bg-chromatic-ocean" },
        { label: "Hotels", pct: "45%", color: "bg-chromatic-aurora" },
      ].map((c) => (
        <div key={c.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full shrink-0 ${c.color}`} aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground truncate">{c.label}</span>
        </div>
      ))}
    </div>
  </div>
)

const aiVisual = (
  <div className="rounded-xl bg-white/60 border border-white/40 p-3 space-y-2 backdrop-blur-sm">
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chromatic-aurora shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed italic">
        &ldquo;Plan a 7-day trip to Kyoto and Osaka focusing on culture and food&rdquo;
      </p>
    </div>
    <div className="ml-9 space-y-1.5">
      {["Day 1: Fushimi Inari & Nishiki Market", "Day 2: Arashiyama bamboo forest", "Day 3: Dotonbori food tour"].map((d) => (
        <div key={d} className="flex items-center gap-1.5 text-[10px] text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
          {d}
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">+ 4 more days…</p>
    </div>
  </div>
)

export function FeatureGrid() {
  return (
    <section id="features" className="py-16 md:py-24 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop" aria-labelledby="features-heading">
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
      <div id="how-it-works" className="mt-20">
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
