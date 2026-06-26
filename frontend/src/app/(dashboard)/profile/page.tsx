"use client";

import Link from "next/link"
import { useAuth, useLogout } from "@/features/auth/hooks";
import { StatsSection } from "@/features/trip/components/StatsSection";

export default function ProfilePage() {
  const { user } = useAuth();
  const { mutate: logout, isPending: loggingOut } = useLogout();

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      {/* Profile header */}
      <div className="mb-8 flex flex-col items-center text-center">
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.name ?? "User avatar"}
            className="mb-4 h-24 w-24 rounded-full border-2 border-border object-cover shadow-sm"
          />
        ) : (
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground shadow-sm">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
        <h1 className="text-headline-md font-headline-md text-on-surface">
          {user?.name ?? "Traveler"}
        </h1>
        {user?.email && (
          <p className="mt-1 text-body-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      {/* Stats */}
      <StatsSection />

      {/* Legal links */}
      <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
      </div>

      {/* Logout */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => logout()}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}
