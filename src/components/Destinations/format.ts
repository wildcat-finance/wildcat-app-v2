import type { TFunction } from "i18next"

import { formatBps, formatCompactNumber } from "@/utils/formatters"

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

export const formatFractionPercent = (fraction: number | null) =>
  fraction === null || !Number.isFinite(fraction)
    ? "—"
    : `${formatBps(fraction * 10_000)}%`

export const formatLiquidity = (
  amount: number,
  symbol: string,
  amountUsd: number | null,
) => {
  const tokens = `${formatCompactNumber(amount)} ${symbol}`
  return amountUsd === null ? tokens : `${tokens} (${usd.format(amountUsd)})`
}

export const formatLiquidityShort = (
  amount: number,
  symbol: string,
  amountUsd: number | null,
) =>
  amountUsd === null
    ? `${formatCompactNumber(amount)} ${symbol}`
    : usd.format(amountUsd)

export const formatDataAge = (t: TFunction, asOfSec: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() / 1000 - asOfSec) / 60))
  if (minutes < 1) return t("destinations.time.justNow")
  if (minutes < 60) return t("destinations.time.minutes", { count: minutes })
  return t("destinations.time.hours", { count: Math.floor(minutes / 60) })
}
