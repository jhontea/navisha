import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { UserBadge } from "@/features/auth/components/UserBadge"
import { TripList } from "@/features/trip/components/TripList"

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Trips</h1>
          <p className="text-sm text-muted-foreground">
            Plan and track your journeys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UserBadge />
          <Link href="/trips/new">
            <Button size="sm">New trip</Button>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <TripList />
    </main>
  )
}
