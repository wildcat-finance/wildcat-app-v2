export const RAY = BigInt("1000000000000000000000000000")

export const ANALYTICS_TIME_RANGES = [
  { value: "7d", label: "7d", seconds: 7 * 86_400 },
  { value: "30d", label: "30d", seconds: 30 * 86_400 },
  { value: "90d", label: "90d", seconds: 90 * 86_400 },
  { value: "1y", label: "1y", seconds: 365 * 86_400 },
  { value: "all", label: "All", seconds: null },
] as const

export type AnalyticsTimeRange = (typeof ANALYTICS_TIME_RANGES)[number]["value"]

export const normalizeScaledAmount = (scaled: string, scaleFactor: string) =>
  (BigInt(scaled) * BigInt(scaleFactor)) / RAY

export const toHumanAmount = (raw: string | bigint, decimals: number) =>
  Number(typeof raw === "string" ? BigInt(raw) : raw) / 10 ** decimals

export const formatUsd = (
  value: number,
  opts?: {
    compact?: boolean
    maximumFractionDigits?: number
  },
) => {
  if (!Number.isFinite(value)) return "$0"

  if (opts?.compact) {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  }).format(value)
}

export const formatAxisNumber = (value: number) => {
  const abs = Math.abs(value)

  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  if (abs >= 1) return `${Math.round(value)}`

  return value.toFixed(2)
}

export const formatPercent = (value: number | undefined, decimals = 2) =>
  `${
    typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(decimals)
      : "0.00"
  }%`

export const formatShortDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

export const formatDateLabel = (timestamp: number) =>
  new Date(timestamp * 1000).toISOString().slice(0, 10)

export const formatElapsed = (seconds: number) => {
  const days = Math.floor(seconds / 86_400)

  if (days >= 365) {
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    return months > 0 ? `${years}y ${months}mo` : `${years}y`
  }

  if (days >= 30) return `${Math.floor(days / 30)}mo`
  if (days >= 1) return `${days}d`

  const hours = Math.floor(seconds / 3600)
  if (hours >= 1) return `${hours}h`

  const minutes = Math.floor(seconds / 60)
  return `${Math.max(minutes, 0)}m`
}

export const relativeHoursUntil = (timestamp: number) => {
  const deltaHours = Math.max(
    0,
    Math.round((timestamp - Date.now() / 1000) / 3600),
  )

  return `${deltaHours}h`
}

export const filterByTimeRange = <
  T extends {
    timestamp: number
  },
>(
  points: T[],
  range: AnalyticsTimeRange,
) => {
  const selectedRange = ANALYTICS_TIME_RANGES.find(
    (timeRange) => timeRange.value === range,
  )

  if (!selectedRange || selectedRange.seconds === null || points.length === 0) {
    return points
  }

  const latestTimestamp = points[points.length - 1]?.timestamp ?? 0
  const minTimestamp = latestTimestamp - selectedRange.seconds

  return points.filter((point) => point.timestamp >= minTimestamp)
}

export const getTimeRangeTicks = <
  T extends {
    timestamp: number
  },
>(
  points: T[],
  targetTicks = 6,
) => {
  if (points.length <= targetTicks) {
    return points.map((point) => point.timestamp)
  }

  const step = Math.max(1, Math.floor(points.length / (targetTicks - 1)))
  const ticks = points
    .filter((_, index) => index % step === 0)
    .map((point) => point.timestamp)

  const lastTimestamp = points[points.length - 1]?.timestamp
  if (lastTimestamp && ticks[ticks.length - 1] !== lastTimestamp) {
    ticks.push(lastTimestamp)
  }

  return ticks
}
