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

/** "GA 874: CGK → HND": the label (or type) and the route, for calendar events and the printed itinerary. */
export function transportTitle(t: { label: string; type: string; from_location: string; to_location: string }): string {
  const name = t.label || transportTypeLabel(t.type)
  const route = [t.from_location, t.to_location].filter(Boolean).join(" → ")
  return route ? `${name}: ${route}` : name
}
