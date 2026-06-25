"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

/** Consistent CTA buttons for trip creation.
 *  Phase 3A: replaces the duplicated Generate + New Trip button pair
 *  in dashboard and trips pages. */
export function TripCTAs() {
  return (
    <>
      <Link
        href="/trips/generate"
        className="flex items-center justify-center gap-2 border border-primary text-primary px-6 py-3 rounded-xl font-label-md text-label-md hover:bg-primary/5 transition-all active:scale-[0.98]"
      >
        <MaterialIcon name="auto_fix_high" size={20} />
        Generate Trip with AI
      </Link>
      <Link
        href="/trips/new"
        className="flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
      >
        <MaterialIcon name="add" size={20} />
        New Trip
      </Link>
    </>
  );
}
