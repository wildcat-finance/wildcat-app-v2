import { stripTrailingZeroes } from "@wildcatfi/wildcat-sdk"

// Platforms like Morpho cut their figures to two decimals instead of rounding
// them (7.509% shows as 7.50%), so the same rule keeps our numbers equal to
// theirs. toPrecision(15) first drops float noise such as 674.9999999999999
// without rounding up real digits like 351959.999995.
const truncateTo2 = (value: number) =>
  stripTrailingZeroes(
    (Math.trunc(Number((value * 100).toPrecision(15))) / 100).toFixed(2),
  )

const COMPACT_UNITS: [number, string][] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
]

/** null when the figure is missing, so the caller can label it Unavailable */
export const formatFractionPercent = (fraction: number | null) =>
  fraction === null || !Number.isFinite(fraction)
    ? null
    : `${truncateTo2(fraction * 100)}%`

export const aprFromApy = (apy: number | null) =>
  apy === null || !Number.isFinite(apy) ? null : Math.log1p(apy)

/** null when the figure is missing, so the caller can label it Unavailable */
export const formatTokenCompact = (amount: number, symbol: string) => {
  if (!Number.isFinite(amount)) return null
  const [scale, unit] = COMPACT_UNITS.find(
    ([min]) => Math.abs(amount) >= min,
  ) ?? [1, ""]
  return `${truncateTo2(amount / scale)}${unit} ${symbol}`
}

export const formatList = (locale: string, items: string[]) =>
  new Intl.ListFormat(locale, { type: "conjunction" }).format(items)
