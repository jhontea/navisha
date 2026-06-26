"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BedDouble, Bus, DollarSign, MapPin, Plus, Wand2 } from "lucide-react";

interface FABProps {
  tripId?: string;
  activeTab?: string;
}

/** Gradient-filled FAB with glass speed-dial. Context-aware actions. */
export function FAB({ tripId, activeTab }: FABProps) {
  const [open, setOpen] = useState(false);
  const isOnTrip = !!tripId;

  const actions = isOnTrip
    ? getTripActions(tripId!, activeTab)
    : getHomeActions();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed-dial menu */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-3 md:bottom-6">
        {open &&
          actions.map((action, i) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={() => setOpen(false)}
              className="glass flex animate-fade-up items-center gap-2.5 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium transition-all hover:bg-white/25 active:scale-95"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {action.label}
              <action.icon className="h-4 w-4 text-chromatic-sky" />
            </Link>
          ))}

        {/* Main FAB — gradient fill */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close actions menu" : "Quick actions"}
          aria-expanded={open}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white shadow-lg shadow-chromatic-sunset/25 transition-all duration-300 hover:shadow-xl hover:shadow-chromatic-sunset/40 active:scale-95",
            open && "rotate-45 bg-muted-foreground shadow-muted-foreground/30"
          )}
        >
          <Plus className="h-6 w-6 transition-transform" />
        </button>
      </div>
    </>
  );
}

interface FabAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getHomeActions(): FabAction[] {
  return [
    { label: "Generate with AI", href: "/trips/generate", icon: Wand2 },
    { label: "Plan Manually", href: "/trips/new", icon: Plus },
  ];
}

function getTripActions(tripId: string, _tab?: string): FabAction[] {
  const base = `/trips/${tripId}`;
  return [
    { label: "Add Activity", href: base, icon: MapPin },
    { label: "Add Expense", href: `${base}/budget`, icon: DollarSign },
    { label: "Add Stay", href: `${base}/stay`, icon: BedDouble },
    { label: "Add Transport", href: `${base}/transport`, icon: Bus },
  ];
}