"use client"

import { useState, type ReactNode } from "react"
import { CalendarDays, Plane, Plus, Trash2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"
import { IconButton } from "@/components/IconButton"
import { MoneyText } from "@/components/MoneyText"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { StatTile } from "@/components/StatTile"
import { UserAvatar } from "@/components/UserAvatar"
import { CurrencyBadge } from "@/features/currency/components/CurrencyBadge"
import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/features/expense/categoryColors"

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
  ["background", "bg-background border"],
  ["card", "bg-card border"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["destructive", "bg-destructive"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["info", "bg-info"],
] as const

const TYPE = [
  ["text-xs", "12px · label, meta, badge (minimum)"],
  ["text-sm", "14px · body in cards, forms, buttons"],
  ["text-base", "16px · main body"],
  ["text-lg", "18px · card title"],
  ["text-xl", "20px · section title"],
  ["text-2xl", "24px · page title (mobile)"],
  ["text-3xl", "30px · page title (desktop)"],
] as const

export function UiCatalog() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:px-8">
      <header>
        <p className="text-sm text-muted-foreground">Development only</p>
        <h1 className="font-display text-3xl font-semibold">UI catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens and components from docs/DESIGN_SYSTEM.md.
        </p>
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
