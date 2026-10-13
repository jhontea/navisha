"use client";

import Link from "next/link";
import { ChevronDown, PenLine, Plus, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEM = "min-h-11 gap-2.5 px-3 text-sm";

/**
 * The single "New trip" action on the Trips page: one button that offers
 * the two ways to start (from scratch or generated with AI).
 */
export function TripCTAs() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants()}>
        <Plus aria-hidden="true" />
        New trip
        <ChevronDown className="-mr-1 opacity-80" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className={ITEM} render={<Link href="/trips/new" />}>
          <PenLine aria-hidden="true" />
          <span>
            <span className="block font-medium">Start from scratch</span>
            <span className="block text-xs text-muted-foreground">Add days and activities yourself</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} render={<Link href="/trips/generate" />}>
          <Sparkles aria-hidden="true" />
          <span>
            <span className="block font-medium">Generate with AI</span>
            <span className="block text-xs text-muted-foreground">Answer a few questions, get a draft</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
