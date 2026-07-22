export type ActivityType = "location" | "note" | "todo"

export interface LocationPayload {
  location_name: string
  lat: number
  lng: number
  google_place_id: string
  address: string
  notes: string
  external_url?: string
  image_urls: string[]
}

export interface NotePayload {
  content: string
}

export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export interface TodoPayload {
  items: TodoItem[]
}

export type ActivityPayload = LocationPayload | NotePayload | TodoPayload

export interface Activity {
  id: string
  day_id: string
  type: ActivityType
  title: string
  start_time: string
  end_time: string
  order_index: number
  payload: ActivityPayload | null
  created_at: string
  updated_at: string
}

export interface ActivityListResponse {
  items: Activity[]
}

export interface CreateActivityInput {
  type: ActivityType
  title: string
  start_time?: string
  end_time?: string
  payload: ActivityPayload
}

export interface UpdateActivityInput {
  title?: string
  start_time?: string
  end_time?: string
  payload?: ActivityPayload
}

export interface ReorderInput {
  ids: string[]
}
