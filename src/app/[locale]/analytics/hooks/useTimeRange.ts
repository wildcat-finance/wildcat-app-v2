import { useState, useMemo } from "react"

export function useTimeRange<T extends { timestamp: number }>(data: T[]) {
  const [range, setRange] = useState("All")
  const filtered = useMemo(() => {
    const d: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
      All: 99999,
    }
    return data.slice(-(d[range] ?? 99999))
  }, [data, range])
  return {
    filtered,
    range,
    setRange,
    tickInterval: Math.max(1, Math.floor(filtered.length / 12)),
  }
}
