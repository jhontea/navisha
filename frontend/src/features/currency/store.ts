import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ConversionRecord {
  id: string
  from: string
  to: string
  amount: number
  convertedAmount: number
  rate: number
  createdAt: number // epoch ms
}

interface RecentConversionsState {
  records: ConversionRecord[]
  add: (record: Omit<ConversionRecord, "id" | "createdAt">) => void
  remove: (id: string) => void
  clear: () => void
}

const MAX_RECORDS = 8

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useRecentConversionsStore = create<RecentConversionsState>()(
  persist(
    (set) => ({
      records: [],
      add: (record) =>
        set((state) => {
          const next: ConversionRecord = {
            ...record,
            id: makeId(),
            createdAt: Date.now(),
          }
          // Dedupe consecutive identical conversions (same from/to/amount).
          const last = state.records[0]
          const isDuplicate =
            last &&
            last.from === next.from &&
            last.to === next.to &&
            last.amount === next.amount
          if (isDuplicate) return state
          return { records: [next, ...state.records].slice(0, MAX_RECORDS) }
        }),
      remove: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),
      clear: () => set({ records: [] }),
    }),
    { name: "navisha-recent-conversions" },
  ),
)
