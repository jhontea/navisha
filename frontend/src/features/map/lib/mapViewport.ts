import { distanceKm } from "@/features/trip/lib/venueRadius"

/** Deepest zoom a fit may reach, so a few close points don't fill the screen with one street. */
export const MAX_FIT_ZOOM = 15

/** Places chained together by hops under this distance form one group (Osaka-Tokyo is ~400 km). */
const GROUP_LINK_KM = 500
/** The groups left out may hold at most this share of the points; more means the trip is just spread out. */
const MAX_OUTSIDE_SHARE = 0.2

/**
 * Which points the map should frame. Points are grouped by chaining places
 * within GROUP_LINK_KM of each other; if the biggest group holds all but a
 * small minority (e.g. "home" and the departure airport before an overseas
 * trip) the rest are left out, so they don't zoom the map out to sea. Their
 * pins stay on the map and `outside` counts them. A trip split into several
 * big groups frames everything.
 */
export function framePoints<T extends { lat: number; lng: number }>(
  points: T[],
): { framed: T[]; outside: number } {
  const all = { framed: points, outside: 0 }
  if (points.length < 3) return all
  const group = new Array<number>(points.length).fill(-1)
  const sizes: number[] = []
  for (let start = 0; start < points.length; start++) {
    if (group[start] !== -1) continue
    const id = sizes.length
    sizes.push(0)
    const stack = [start]
    group[start] = id
    while (stack.length > 0) {
      const i = stack.pop()!
      sizes[id]++
      for (let j = 0; j < points.length; j++) {
        if (group[j] === -1 && distanceKm(points[i], points[j]) <= GROUP_LINK_KM) {
          group[j] = id
          stack.push(j)
        }
      }
    }
  }
  const main = sizes.indexOf(Math.max(...sizes))
  const outside = points.length - sizes[main]
  if (outside === 0 || outside > points.length * MAX_OUTSIDE_SHARE || sizes[main] < 2) return all
  return { framed: points.filter((_, i) => group[i] === main), outside }
}
