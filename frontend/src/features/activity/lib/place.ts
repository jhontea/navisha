/**
 * The address without a leading copy of the place name: geocoders often return
 * "Senso-ji Temple, 2-3-1 Asakusa, Tokyo" for the place "Senso-ji Temple", which
 * would read "Senso-ji Temple · Senso-ji Temple, 2-3-1 Asakusa, Tokyo".
 */
export function addressAfterName(name: string | null | undefined, address: string | null | undefined): string {
  const addr = (address ?? "").trim()
  const n = (name ?? "").trim()
  if (!n || !addr) return addr
  if (addr.toLowerCase() === n.toLowerCase()) return ""
  if (addr.toLowerCase().startsWith(n.toLowerCase())) {
    const rest = addr.slice(n.length)
    // Only a whole leading name followed by a separator, not "Senso-ji Temple Road".
    if (/^\s*[,·\-–|]/.test(rest)) return rest.replace(/^\s*[,·\-–|]\s*/, "")
  }
  return addr
}
