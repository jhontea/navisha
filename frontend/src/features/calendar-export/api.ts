import { api } from "@/lib/api"

export interface CalendarExportStatus {
  exported_count: number
}

export interface CalendarExportResult {
  created: number
  removed: number
  total: number
  message: string
}

export const calendarExportApi = {
  status: (tripId: string) =>
    api.get<CalendarExportStatus>(`/trips/${tripId}/calendar-export`),

  export: (tripId: string) =>
    api.post<CalendarExportResult>(`/trips/${tripId}/calendar-export`),

  remove: (tripId: string) =>
    api.delete<{ message: string }>(`/trips/${tripId}/calendar-export`),
}
