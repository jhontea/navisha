/**
 * The stay name to fill in when a place is picked: the place's name, but
 * only while the traveller has not typed a name of their own.
 */
export function stayNameFromPlace(currentName: string, place: { location_name: string }): string | null {
  if (currentName.trim()) return null
  const name = place.location_name.trim()
  return name || null
}
