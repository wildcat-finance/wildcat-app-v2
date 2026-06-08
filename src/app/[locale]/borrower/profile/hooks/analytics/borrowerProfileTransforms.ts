import {
  BorrowerAggregateDebtPoint,
  BorrowerWithdrawalAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  relativeHoursUntilAt,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"

export type BorrowerAggregateDebtRaw = {
  startTimestamp: number
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
  market: {
    id: string
    asset: { decimals: number }
  }
}

export const buildBorrowerAggregateDebtData = ({
  marketDailyStats,
  priceMap,
  nameMap,
}: {
  marketDailyStats: BorrowerAggregateDebtRaw[]
  priceMap: Record<string, number>
  nameMap: Record<string, string>
}) => {
  const byDay = new Map<number, Map<string, number>>()
  const seenMarkets = new Set<string>()

  marketDailyStats.forEach((entry) => {
    const marketId = entry.market.id
    seenMarkets.add(marketId)

    const debtToken = toHumanAmount(
      normalizeScaledAmount(entry.scaledTotalSupply, entry.scaleFactor),
      entry.market.asset.decimals,
    )
    const historicalPrice = entry.usdPrice ? Number(entry.usdPrice) : null
    const fallbackPrice = priceMap[marketId] ?? 0
    const price =
      historicalPrice && Number.isFinite(historicalPrice)
        ? historicalPrice
        : fallbackPrice
    const debtUsd = debtToken * price

    const dayBucket = byDay.get(entry.startTimestamp) ?? new Map()
    dayBucket.set(marketId, debtUsd)
    byDay.set(entry.startTimestamp, dayBucket)
  })

  const orderedMarketIds = Array.from(seenMarkets).sort((left, right) =>
    (nameMap[left] ?? left).localeCompare(nameMap[right] ?? right),
  )
  const lastDebtByMarket = new Map<string, number>()

  const points: BorrowerAggregateDebtPoint[] = Array.from(byDay.entries())
    .sort(([left], [right]) => left - right)
    .map(([timestamp, marketDebts]) => {
      marketDebts.forEach((debt, marketId) => {
        lastDebtByMarket.set(marketId, debt)
      })

      const point: BorrowerAggregateDebtPoint = {
        date: formatDateLabel(timestamp),
        dateShort: formatShortDate(timestamp),
        timestamp,
        totalDebtUsd: 0,
      }

      let total = 0
      orderedMarketIds.forEach((marketId) => {
        const debt = lastDebtByMarket.get(marketId) ?? 0
        point[marketId] = debt
        total += debt
      })

      point.totalDebtUsd = total
      return point
    })

  return { points, marketIds: orderedMarketIds }
}

export type BorrowerWithdrawalBatchRaw = {
  id: string
  expiry: string
  isExpired: boolean
  isClosed: boolean
  totalNormalizedRequests: string
  market: {
    id: string
    name: string
    asset: {
      decimals: number
    }
  }
  expiration: {
    normalizedAmountPaid: string
    normalizedAmountOwed: string
  } | null
}

const SHORTFALL_EPSILON_USD = 0.01

export const buildBorrowerWithdrawalAnalytics = ({
  withdrawalBatches,
  priceMap,
  nowSec,
}: {
  withdrawalBatches: BorrowerWithdrawalBatchRaw[]
  priceMap: Record<string, number>
  nowSec: number
}): BorrowerWithdrawalAnalytics => {
  let pendingBatches = 0
  let totalQueued = 0
  let nextExpiryTimestamp = Number.POSITIVE_INFINITY

  const settledBatches = withdrawalBatches.reduce<
    BorrowerWithdrawalAnalytics["batches"]
  >((batches, batch) => {
    const price = priceMap[batch.market.id] ?? 0
    const requested =
      toHumanAmount(
        batch.totalNormalizedRequests,
        batch.market.asset.decimals,
      ) * price

    if (!batch.isExpired && !batch.isClosed) {
      pendingBatches += 1
      totalQueued += requested
      nextExpiryTimestamp = Math.min(nextExpiryTimestamp, Number(batch.expiry))
      return batches
    }

    const paid = batch.expiration
      ? toHumanAmount(
          batch.expiration.normalizedAmountPaid,
          batch.market.asset.decimals,
        ) * price
      : requested
    const shortfall = batch.expiration
      ? toHumanAmount(
          batch.expiration.normalizedAmountOwed,
          batch.market.asset.decimals,
        ) * price
      : 0

    let status: BorrowerWithdrawalAnalytics["batches"][number]["status"] =
      "paid"
    if (shortfall > SHORTFALL_EPSILON_USD) {
      status = batch.isClosed ? "paid-late" : "unpaid"
    }

    batches.push({
      id: batch.id,
      marketName: batch.market.name,
      label: `#${batches.length + 1}`,
      expiryTimestamp: Number(batch.expiry),
      requested,
      paid:
        status === "paid" || status === "unpaid"
          ? Math.min(paid, requested)
          : 0,
      paidLate: status === "paid-late" ? Math.min(paid, requested) : 0,
      unpaid: status === "unpaid" ? Math.min(shortfall, requested) : 0,
      shortfall,
      status,
    })

    return batches
  }, [])

  const underpaidBatches = settledBatches.filter(
    (batch) => batch.shortfall > SHORTFALL_EPSILON_USD,
  )

  return {
    totalExpired: settledBatches.length,
    fullyPaidPct:
      settledBatches.length > 0
        ? Math.round(
            (settledBatches.filter((batch) => batch.status === "paid").length /
              settledBatches.length) *
              100,
          )
        : 100,
    paidLateCount: settledBatches.filter(
      (batch) => batch.status === "paid-late",
    ).length,
    unpaidCount: settledBatches.filter((batch) => batch.status === "unpaid")
      .length,
    avgShortfallPct:
      underpaidBatches.length > 0
        ? Math.round(
            underpaidBatches.reduce((sum, batch) => {
              if (batch.requested === 0) return sum
              return sum + (batch.shortfall / batch.requested) * 100
            }, 0) / underpaidBatches.length,
          )
        : 0,
    pendingBatches,
    totalQueued,
    nextExpiry:
      nextExpiryTimestamp < Number.POSITIVE_INFINITY
        ? relativeHoursUntilAt(nextExpiryTimestamp, nowSec)
        : "—",
    batches: settledBatches,
  }
}
