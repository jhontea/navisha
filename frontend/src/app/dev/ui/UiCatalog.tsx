"use client"

import { useState, type ReactNode } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Home,
  Hotel,
  Map as MapIcon,
  MoreHorizontal,
  Plane,
  Plus,
  Share,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Chip } from "@/components/Chip"
import { DateCircles, type DateCircleDay } from "@/components/DateCircles"
import { EmptyState } from "@/components/EmptyState"
import { FactBox } from "@/components/FactBox"
import { StatusChip } from "@/components/StatusChip"
import { TabPills } from "@/components/TabPills"
import { TimePills, type TimePill } from "@/components/TimePills"
import { IconButton } from "@/components/IconButton"
import { MoneyText } from "@/components/MoneyText"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { StatTile } from "@/components/StatTile"
import { ThemeToggle } from "@/components/ThemeToggle"
import { UserAvatar } from "@/components/UserAvatar"
import { CurrencyBadge } from "@/features/currency/components/CurrencyBadge"
import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/features/expense/categoryColors"
import { BudgetMeter } from "@/features/expense/components/BudgetMeter"
import { BoardingPass } from "@/features/transportation/components/BoardingPass"
import type { Transportation } from "@/features/transportation/types"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b pb-2 text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

const COLORS = [
  ["primary", "bg-primary"],
  ["primary-soft", "bg-primary-soft"],
  ["background", "bg-background border"],
  ["card", "bg-card border"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["destructive", "bg-destructive"],
  ["destructive-bg", "bg-destructive-bg"],
  ["success-bg", "bg-success-bg"],
  ["warning-bg", "bg-warning-bg"],
  ["cover-fallback", "bg-cover-fallback"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["info", "bg-info"],
] as const

const TYPE = [
  ["text-hero", "40px · trip title on the desktop hero (display)"],
  ["text-xs", "12px · label, meta, badge (minimum)"],
  ["text-sm", "14px · body in cards, forms, buttons"],
  ["text-base", "16px · main body"],
  ["text-lg", "18px · card title"],
  ["text-xl", "20px · section title"],
  ["text-2xl", "24px · page title (mobile)"],
  ["text-3xl", "30px · page title (desktop)"],
] as const

// Demo data: the "Dream Tour Umrah 9 Hari" trip used in the V2 mockups.
const DEMO_DAYS: DateCircleDay[] = [10, 11, 12, 13, 14, 15, 16, 17, 18].map((d, i) => ({
  id: `d${i + 1}`,
  date: `2027-01-${d}`,
  hasItems: [0, 1, 2, 4].includes(i),
}))

const DEMO_TIMES: TimePill[] = [
  { id: "t1", label: "06:00 – 07:00", description: "Meet at Soekarno-Hatta" },
  { id: "t2", label: "10:00 – 15:55", description: "Flight SV 817" },
  { id: "t3", label: "17:30", description: "Transfer to the hotel" },
]

const DEMO_BASE = { trip_id: "demo", notes: "", created_at: "", updated_at: "" }
const DEMO_FLIGHT: Transportation = {
  ...DEMO_BASE,
  id: "f1",
  type: "flight",
  label: "SV 817",
  operator: "Saudia Airlines",
  reference_number: "",
  from_location: "Bandara Soekarno-Hatta (CGK), Jakarta",
  to_location: "Bandara King Abdulaziz (JED), Jeddah",
  departure_datetime: "2027-01-10T10:00:00",
  arrival_datetime: "2027-01-10T15:55:00",
}
const DEMO_TRAIN: Transportation = {
  ...DEMO_BASE,
  id: "t1",
  type: "train",
  label: "Kereta Cepat Haramain",
  operator: "Haramain High Speed Railway",
  reference_number: "HHR-2741",
  from_location: "Stasiun Haramain Makkah",
  to_location: "Stasiun Haramain Madinah",
  departure_datetime: "2027-01-14T09:00:00",
  arrival_datetime: null,
}

const DEMO_SPEND = { accommodation: 2680000, transport: 400000, food: 1147000, souvenir: 640000 }

export function UiCatalog() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [day, setDay] = useState("d1")
  const [time, setTime] = useState("t1")

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:px-8">
      <header>
        <p className="text-sm text-muted-foreground">Development only</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">UI catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens and components from docs/DESIGN.md (V2 · Soft).
        </p>
        <ThemeToggle className="mt-4 w-56" />
      </header>

      <Section title="Colors">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {COLORS.map(([name, cls]) => (
            <div key={name} className="space-y-1">
              <div className={`h-12 rounded-md ${cls}`} />
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
        <p className="text-sm font-semibold">Expense categories (fixed order)</p>
        <div className="flex flex-wrap gap-4">
          {CATEGORY_ORDER.map((c) => {
            const cfg = CATEGORY_COLORS[c]
            return (
              <span key={c} className="inline-flex items-center gap-2 text-sm text-foreground">
                <span className={`h-3 w-3 rounded-full ${cfg.bar}`} aria-hidden="true" />
                {cfg.label}
              </span>
            )
          })}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2">
          {TYPE.map(([cls, desc]) => (
            <div key={cls} className="flex items-baseline gap-4">
              <code className="w-24 shrink-0 text-xs text-muted-foreground">{cls}</code>
              <span className={`${cls} text-foreground`}>{desc}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="font-display text-2xl font-extrabold text-foreground">
            Umrah <span className="text-muted-foreground">9 Hari</span>
          </p>
          <p className="text-xs text-muted-foreground">font-display (Nunito) · two-tone title</p>
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap items-end gap-3">
          {(["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-full"] as const).map((r) => (
            <div key={r} className="space-y-1 text-center">
              <div className={`h-14 w-20 border bg-card shadow-card ${r}`} />
              <code className="text-xs text-muted-foreground">{r}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button><Plus />Add expense</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Remove</Button>
          <Button variant="danger"><Trash2 />Delete trip</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Large (48)</Button>
          <Button>Default (44 / 40)</Button>
          <Button size="sm">Small (36)</Button>
          <Button size="xs" variant="outline">XS (32, desktop)</Button>
          <IconButton label="Delete" icon={<Trash2 />} />
          <IconButton label="Add" icon={<Plus />} variant="outline" size="sm" />
        </div>
      </Section>

      <Section title="Navigation & pickers (V2)">
        <TabPills
          aria-label="Trip sections (demo)"
          items={[
            { href: "/dev/ui", label: "Itinerary", icon: CalendarDays, active: true },
            { href: "/dev/ui#map", label: "Map", icon: MapIcon },
            { href: "/dev/ui#bookings", label: "Bookings", icon: Ticket },
            { href: "/dev/ui#budget", label: "Budget", icon: Wallet },
            { href: "/dev/ui#summary", label: "Summary", icon: FileText },
          ]}
        />
        <DateCircles days={DEMO_DAYS} value={day} onChange={setDay} aria-label="Trip day (demo)" />
        <TimePills items={DEMO_TIMES} value={time} onChange={setTime} aria-label="Times on Day 1 (demo)" />
        <div className="flex flex-wrap gap-2">
          <Chip pressed>All</Chip>
          <Chip>Stay</Chip>
          <Chip>Food</Chip>
          <Chip variant="option" pressed icon={Hotel}>Hotel</Chip>
          <Chip variant="option" icon={Home}>Apartment</Chip>
        </div>
      </Section>

      <Section title="Status, facts, cover buttons (V2)">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="success" icon={Check}>4/6 ready</StatusChip>
          <StatusChip tone="warning">97% used</StatusChip>
          <StatusChip tone="danger">Over budget</StatusChip>
          <StatusChip tone="info">88 days to go</StatusChip>
          <StatusChip>Completed</StatusChip>
        </div>
        <div className="grid max-w-md grid-cols-3 gap-2 rounded-xl border bg-card p-3 shadow-card">
          <FactBox label="Check-in" value="10 Jan" />
          <FactBox label="Nights" value="4" />
          <FactBox label="To Haram" value="± 250 m" />
        </div>
        <div className="bg-cover-fallback flex h-32 items-start gap-2 rounded-3xl p-3">
          <IconButton label="Back" icon={<ArrowLeft />} variant="cover" />
          <span className="flex-1" />
          <IconButton label="Share" icon={<Share />} variant="cover" />
          <IconButton label="More actions" icon={<MoreHorizontal />} variant="cover" />
        </div>
      </Section>

      <Section title="Boarding pass (V2)">
        <div className="grid gap-4 md:grid-cols-2">
          <BoardingPass transportation={DEMO_FLIGHT} dayNumber={1} />
          <BoardingPass transportation={DEMO_TRAIN} dayNumber={5} />
        </div>
      </Section>

      <Section title="Budget meter (V2)">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Spent</p>
            <p className="font-display text-3xl font-extrabold">
              <MoneyText amount={4867000} currency="IDR" />
            </p>
            <BudgetMeter byCategory={DEMO_SPEND} budget={5000000} label="Budget used (demo)" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>97% used</span>
              <span>Rp 133,000 left</span>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Over budget</p>
            <BudgetMeter byCategory={DEMO_SPEND} budget={4000000} label="Budget used, over (demo)" />
            <p className="text-sm text-muted-foreground">No budget set: category mix only</p>
            <BudgetMeter byCategory={DEMO_SPEND} label="Spending mix (demo)" />
          </div>
        </div>
      </Section>

      <Section title="Money & currency">
        <div className="flex flex-wrap items-center gap-6 text-lg">
          <MoneyText amount={68340303.69} currency="IDR" />
          <MoneyText amount={12.5} currency="USD" />
          <MoneyText amount={1200} currency="JPY" />
          <MoneyText amount={-3340303.69} currency="IDR" className="text-destructive" />
        </div>
        <div className="flex gap-2">
          {["IDR", "USD", "JPY", "EUR", "SGD"].map((c) => (
            <CurrencyBadge key={c} code={c} className="bg-muted" />
          ))}
        </div>
      </Section>

      <Section title="Stat tiles">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Spent" icon={Wallet} value={<MoneyText amount={68340304} currency="IDR" />} hint="of Rp 65,000,000" tone="danger" />
          <StatTile label="Days" icon={CalendarDays} value="10" hint="9 nights" />
          <StatTile label="Transport" icon={Plane} value="5" />
          <StatTile label="Activities" value="61" />
        </div>
      </Section>

      <Section title="Cards & badges">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Card</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">bg-card, hairline ring, no gradient.</CardContent>
          </Card>
          <div className="rounded-xl border bg-card p-4 shadow-card text-sm">
            <p className="font-semibold">shadow-card</p>
            <p className="text-muted-foreground">Border or shadow, not both plus a gradient.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Over budget</Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-md gap-3">
          <Input placeholder="e.g. Tokyo, Japan" />
          <Input placeholder="Disabled" disabled />
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <UserAvatar name="Ahmad" className="h-10 w-10" textClassName="text-base" />
          <UserAvatar name="Navisha" src="https://invalid.example/avatar.png" className="h-10 w-10" textClassName="text-base" />
          <p className="text-sm text-muted-foreground">Initial fallback (no photo / broken photo)</p>
        </div>
      </Section>

      <Section title="Empty, loading, sheet">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={Plane}
            size="sm"
            title="No transport yet"
            description="Add flights, trains, buses, or transfers to see them in your itinerary."
            className="rounded-xl border border-dashed"
            action={<Button size="sm"><Plus />Add transport</Button>}
          />
          <div className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        <Button variant="outline" onClick={() => setSheetOpen(true)}>Open responsive sheet</Button>
        <ResponsiveSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Add expense"
          description="Bottom sheet on phones, dialog from sm up."
        >
          <div className="grid gap-3">
            <Input placeholder="Title" />
            <Input placeholder="Amount" inputMode="decimal" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={() => setSheetOpen(false)}>Add expense</Button>
            </div>
          </div>
        </ResponsiveSheet>
      </Section>
    </main>
  )
}
