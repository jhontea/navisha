import { Boxes, Bus, Car, Plane, Ship, Train, TramFront } from "lucide-react"

/** Icon per transport type, shared by the timeline card and dot. */
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
  return TRANSPORT_ICON[type ?? "other"] ?? Boxes
}
