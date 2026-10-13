import { Boxes, Bus, Car, Plane, Ship, Train, TramFront } from "lucide-react"

/** Icon per transport type, shared by the Bookings card and the itinerary timeline. */
export const TRANSPORT_ICON: Record<string, typeof Plane> = {
  flight: Plane,
  bus: Bus,
  train: Train,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

export function transportIcon(type: string | undefined): typeof Plane {
  return TRANSPORT_ICON[type?.toLowerCase() ?? "other"] ?? Boxes
}

const LABELS: Record<string, string> = {
  flight: "Flight",
  bus: "Bus",
  train: "Train",
  ferry: "Ferry",
  ship: "Ship",
  car: "Car",
  other: "Transport",
}

export function transportTypeLabel(type: string | undefined): string {
  return LABELS[type?.toLowerCase() ?? "other"] ?? "Transport"
}
