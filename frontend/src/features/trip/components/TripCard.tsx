import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateRange } from "@/lib/utils"
import type { Trip } from "../types"

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="transition hover:border-primary/40 hover:shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{trip.title}</CardTitle>
            <Badge variant="secondary">{trip.base_currency}</Badge>
          </div>
          {trip.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {trip.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
