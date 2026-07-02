"use client";

import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Consistent CTA buttons using buttonVariants for Link elements. */
export function TripCTAs() {
  return (
    <>
      <Link href="/trips/generate" className={cn(buttonVariants({ variant: "glass" }))}>
        <Sparkles className="h-4 w-4 text-primary" />
        Generate with AI
      </Link>
      <Link href="/trips/new" className={cn(buttonVariants({ variant: "gradient" }))}>
        <Plus className="h-4 w-4" />
        New Trip
      </Link>
    </>
  );
}
