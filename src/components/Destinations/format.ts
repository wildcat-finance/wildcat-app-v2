import { formatBps } from "@/utils/formatters"

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

/** null when the figure is missing, so the caller can label it Unavailable */
export const formatFractionPercent = (fraction: number | null) =>
  fraction === null || !Number.isFinite(fraction)
    ? null
    : `${formatBps(fraction * 10_000)}%`

export const aprFromApy = (apy: number | null) =>
  apy === null || !Number.isFinite(apy) ? null : Math.log1p(apy)

export const formatUsdCompact = (amountUsd: number) => usd.format(amountUsd)

export const formatList = (locale: string, items: string[]) =>
  new Intl.ListFormat(locale, { type: "conjunction" }).format(items)
