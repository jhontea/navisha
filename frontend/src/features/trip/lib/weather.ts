import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { addDaysISO } from "./dates"
import { toLocalISODate } from "./status"

/**
 * Whether [startDate, endDate] can touch the forecast window (today..+15).
 * One spare day each side: the backend filters by its own UTC date.
 */
export function inForecastRange(startDate: string, endDate: string, today = toLocalISODate()): boolean {
  return endDate >= addDaysISO(today, -1) && startDate <= addDaysISO(today, 16)
}

/** Icon + English label for a WMO weather code (Open-Meteo `weather_code`). */
export function weatherInfo(code: number): { Icon: LucideIcon; label: string } {
  if (code === 0) return { Icon: Sun, label: "Clear" }
  if (code === 1) return { Icon: CloudSun, label: "Mainly clear" }
  if (code === 2) return { Icon: CloudSun, label: "Partly cloudy" }
  if (code === 3) return { Icon: Cloud, label: "Overcast" }
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Fog" }
  if (code === 56 || code === 57) return { Icon: CloudDrizzle, label: "Freezing drizzle" }
  if (code >= 51 && code <= 55) return { Icon: CloudDrizzle, label: "Drizzle" }
  if (code === 66 || code === 67) return { Icon: CloudRain, label: "Freezing rain" }
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Rain" }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: "Snow" }
  if (code >= 95 && code <= 99) return { Icon: CloudLightning, label: "Thunderstorm" }
  return { Icon: Cloud, label: "Cloudy" }
}
