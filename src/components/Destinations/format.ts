import { formatBps } from "@/utils/formatters"

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

export const formatUsdCompact = (amountUsd: number) => usd.format(amountUsd)
