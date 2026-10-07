import type { TFunction } from "i18next"

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
})

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

export const formatFractionPercent = (fraction: number | null) => {
  if (fraction === null || !Number.isFinite(fraction)) return "—"
  return `${(Math.trunc(fraction * 10_000) / 100).toFixed(2)}%`
}

export const formatFractionPercentTrimmed = (fraction: number) =>
  `${Number((Math.trunc(fraction * 10_000) / 100).toFixed(2))}%`

export const formatLiquidity = (
  amount: number,
  symbol: string,
  amountUsd: number | null,
) => {
  const tokens = `${compact.format(amount)} ${symbol}`
  return amountUsd === null ? tokens : `${tokens} (${usd.format(amountUsd)})`
}

export const formatLiquidityShort = (
  amount: number,
  symbol: string,
  amountUsd: number | null,
) =>
  amountUsd === null
    ? `${compact.format(amount)} ${symbol}`
    : usd.format(amountUsd)

export const formatDataAge = (t: TFunction, asOfSec: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() / 1000 - asOfSec) / 60))
  if (minutes < 1) return t("destinations.time.justNow")
  if (minutes < 60) return t("destinations.time.minutes", { count: minutes })
  return t("destinations.time.hours", { count: Math.floor(minutes / 60) })
}
