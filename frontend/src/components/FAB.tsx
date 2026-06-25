"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Plus, Wand2 } from "lucide-react";

interface FABProps {
  tripId?: string;
  activeTab?: string;
}

/** Floating Action Button with speed-dial menu.
 *  Phase 3B-4: replaces dual CTA buttons with a single contextual FAB.
 *  On home/trips: "Plan Manually" + "Generate with AI"
 *  Inside a trip: context-aware options based on active section. */
export function FAB({ tripId, activeTab }: FABProps) {
  const [open, setOpen] = useState(false);
  const isOnTrip = !!tripId;

  // Determine which actions to show
  const actions = isOnTrip
    ? getTripActions(tripId!, activeTab)
    : getHomeActions();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed-dial menu */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-4">
        {open &&
          actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-xl bg-surface-container-high px-5 py-3 text-sm font-medium text-on-surface shadow-lg transition-all hover:bg-surface-container-highest active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {action.label}
              <action.icon className="h-4 w-4 text-primary" />
            </Link>
          ))}

        {/* Main FAB button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close actions menu" : "Create trip"}
          aria-expanded={open}
          aria-haspopup="true"
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 active:scale-95",
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
    { label: "Plan Manually", href: "/trips/new", icon: Plus },
    { label: "Generate with AI", href: "/trips/generate", icon: Wand2 },
  ];
}

function getTripActions(tripId: string, tab?: string): FabAction[] {
  const base = `/trips/${tripId}`;
  // Context-aware: add the most relevant item first
  switch (tab) {
    case "stay":
      return [
        { label: "Add Stay", href: `${base}/stay`, icon: Plus },
        { label: "Add Activity", href: base, icon: Wand2 },
      ];
    case "transport":
      return [
        { label: "Add Transport", href: `${base}/transport`, icon: Plus },
        { label: "Add Activity", href: base, icon: Wand2 },
      ];
    case "budget":
      return [
        { label: "Add Expense", href: `${base}/budget`, icon: Plus },
        { label: "Add Activity", href: base, icon: Wand2 },
      ];
    default:
      return [{ label: "Add Activity", href: base, icon: Plus }];
  }
}
