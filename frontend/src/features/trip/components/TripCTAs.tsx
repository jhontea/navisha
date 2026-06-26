"use client";

import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";

/** Consistent CTA buttons with glass + gradient design. */
export function TripCTAs() {
  return (
    <>
      <Link
        href="/trips/generate"
        className="glass flex items-center justify-center gap-2 border-white/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/25 hover:shadow-chromatic active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4 text-chromatic-sky" />
        Generate with AI
      </Link>
      <Link
        href="/trips/new"
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-chromatic-sunset/20 transition-all hover:shadow-lg hover:shadow-chromatic-sunset/30 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        New Trip
      </Link>
    </>
  );
}
