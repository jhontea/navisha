import type { TripWeatherDay } from "../weather"
import { weatherInfo } from "../lib/weather"

/** Small forecast pill for a day header: icon + "24° / 31°". */
export function WeatherChip({ weather }: { weather: TripWeatherDay }) {
  const { Icon, label } = weatherInfo(weather.weather_code)
  const min = Math.round(weather.temp_min)
  const max = Math.round(weather.temp_max)
  const description = `${label}, ${min}° to ${max}°C`

  return (
    <span
      role="img"
      aria-label={description}
      title={description}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {min}° / {max}°
    </span>
  )
}
