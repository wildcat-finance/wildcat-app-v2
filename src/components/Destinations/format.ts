import { formatBps, formatCompactNumber } from "@/utils/formatters"

/** null when the figure is missing, so the caller can label it Unavailable */
export const formatFractionPercent = (fraction: number | null) =>
  fraction === null || !Number.isFinite(fraction)
    ? null
    : `${formatBps(fraction * 10_000)}%`

export const aprFromApy = (apy: number | null) =>
  apy === null || !Number.isFinite(apy) ? null : Math.log1p(apy)

/** null when the figure is missing, so the caller can label it Unavailable */
export const formatTokenCompact = (amount: number, symbol: string) =>
  Number.isFinite(amount) ? `${formatCompactNumber(amount)} ${symbol}` : null

export const formatList = (locale: string, items: string[]) =>
  new Intl.ListFormat(locale, { type: "conjunction" }).format(items)
