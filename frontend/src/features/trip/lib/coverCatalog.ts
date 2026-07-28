export type TripCoverDefinition = {
  aliases: string[]
  filename: string
  /** Higher values win when multiple covers match the same destination. */
  priority?: number
}

/**
 * Add new default covers here. Keep aliases normalized conceptually as plain
 * location names; the resolver handles case, accents, and punctuation.
 */
export const DEFAULT_TRIP_COVERS: TripCoverDefinition[] = [
  { aliases: ["tokyo", "tokyo japan"], filename: "navisha-tokyo.png" },
  { aliases: ["osaka", "osaka japan"], filename: "navisha-osaka.png" },
  { aliases: ["kyoto", "kyoto japan"], filename: "navisha-kyoto.png" },
  {
    aliases: ["jakarta", "dki jakarta", "jakarta indonesia"],
    filename: "navisha-jakarta.png",
  },
  {
    aliases: [
      "yogyakarta",
      "jogja",
      "daerah istimewa yogyakarta",
      "yogyakarta indonesia",
      "jogja indonesia",
    ],
    filename: "navisha-yogyakarta.png",
  },
  {
    aliases: ["singapore", "singapura", "singapore city", "republic of singapore"],
    filename: "navisha-singapore.png",
  },
  {
    aliases: [
      "malaysia",
      "federation of malaysia",
      "kuala lumpur",
      "kuala lumpur malaysia",
    ],
    filename: "navisha-malaysia.png",
  },
  {
    aliases: ["vietnam", "viet nam", "socialist republic of vietnam"],
    filename: "navisha-vietnam.png",
  },
  {
    aliases: ["cambodia", "kamboja", "kingdom of cambodia"],
    filename: "navisha-cambodia.png",
  },
  {
    aliases: ["thailand", "kingdom of thailand"],
    filename: "navisha-thailand.png",
  },
  {
    aliases: ["laos", "lao pdr", "lao people's democratic republic"],
    filename: "navisha-laos.png",
  },
  {
    aliases: ["brunei", "brunei darussalam"],
    filename: "navisha-brunei.png",
  },
  {
    aliases: ["myanmar", "burma", "republic of the union of myanmar"],
    filename: "navisha-myanmar.png",
  },
  {
    aliases: ["philippines", "filipina", "pilipinas", "the philippines"],
    filename: "navisha-philippines.png",
  },
  {
    aliases: ["bali", "denpasar", "denpasar bali", "bali indonesia"],
    filename: "navisha-bali.png",
  },
  {
    aliases: ["bogor", "kota bogor", "kabupaten bogor", "bogor jawa barat"],
    filename: "navisha-bogor.png",
  },
  {
    aliases: [
      "lampung",
      "bandar lampung",
      "provinsi lampung",
      "lampung indonesia",
    ],
    filename: "navisha-lampung.png",
  },
  {
    aliases: [
      "majalengka",
      "majalengka sutawangi",
      "sutawangi",
      "kabupaten majalengka",
      "majalengka jawa barat",
    ],
    filename: "navisha-majalengka.png",
  },
  {
    aliases: [
      "cirebon",
      "kota cirebon",
      "kabupaten cirebon",
      "cirebon jawa barat",
    ],
    filename: "navisha-cirebon.png",
  },
  {
    aliases: ["bandung", "kota bandung", "bandung jawa barat"],
    filename: "navisha-bandung.png",
  },
  {
    aliases: [
      "tangerang",
      "kota tangerang",
      "kabupaten tangerang",
      "tangerang banten",
    ],
    filename: "navisha-tangerang.png",
    priority: 100,
  },
  {
    // Kuningan is ambiguous without its province, so do not use a generic
    // `kuningan` alias that could select the wrong regional cover.
    aliases: [
      "kuningan jawa barat",
      "kabupaten kuningan jawa barat",
      "kuningan west java",
      "kuningan regency west java",
    ],
    filename: "navisha-kuningan.png",
  },
  {
    aliases: ["semarang", "kota semarang", "semarang jawa tengah"],
    filename: "navisha-semarang.png",
  },
  {
    aliases: ["bekasi", "kota bekasi", "kabupaten bekasi", "bekasi jawa barat"],
    filename: "navisha-bekasi.png",
  },
  {
    aliases: ["banten", "provinsi banten", "banten indonesia"],
    filename: "navisha-banten.png",
    priority: 10,
  },
  { aliases: ["sukabumi", "sukabumi jawa barat"], filename: "navisha-sukabumi.png" },
  { aliases: ["tegal", "tegal jawa tengah"], filename: "navisha-tegal.png" },
  { aliases: ["surabaya", "surabaya jawa timur"], filename: "navisha-surabaya.png" },
]
