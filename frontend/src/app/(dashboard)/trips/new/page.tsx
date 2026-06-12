import Link from "next/link"
import { TripForm } from "@/features/trip/components/TripForm"

export default function NewTripPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to trips
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New trip</h1>
      </div>
      <TripForm />
    </main>
  )
}
