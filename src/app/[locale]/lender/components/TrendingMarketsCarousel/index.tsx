"use client"

import { useMemo } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "viem"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import {
  RecentDepositsData,
  useRecentDeposits,
} from "@/app/[locale]/lender/hooks/useRecentDeposits"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { TrendingMarketCardApr } from "./TrendingMarketCardApr"
import { TrendingMarketCardInflow } from "./TrendingMarketCardInflow"
import { TrendingMarketCardInterestPaid } from "./TrendingMarketCardInterestPaid"
import { TrendingMarketCardLenders } from "./TrendingMarketCardLenders"
import { TrendingMarketCardTvl } from "./TrendingMarketCardTvl"

const SLOT_COUNT = 5

const ZERO = BigInt(0)

const compactFormat = (num: number): string =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num)

const formatTokenCompact = (raw: bigint, decimals: number): string =>
  compactFormat(parseFloat(formatUnits(raw, decimals)))

const pickMax = <T,>(
  items: T[],
  score: (item: T) => bigint | number | undefined,
): T | undefined => {
  let best: T | undefined
  let bestScore: bigint | number | undefined
  items.forEach((item) => {
    const s = score(item)
    if (s === undefined) return
    if (bestScore === undefined) {
      best = item
      bestScore = s
      return
    }
    if (typeof s === "bigint" && typeof bestScore === "bigint") {
      if (s > bestScore) {
        best = item
        bestScore = s
      }
      return
    }
    if (typeof s === "number" && typeof bestScore === "number") {
      if (s > bestScore) {
        best = item
        bestScore = s
      }
    }
  })
  return best
}

const pickInflowWinner = (
  eligible: MarketAccount[],
  bucket: RecentDepositsData,
) =>
  pickMax(eligible, (account) => {
    const stats = bucket[account.market.address.toLowerCase()]
    return stats && stats.totalAssetAmount > ZERO
      ? stats.totalAssetAmount
      : undefined
  })

const pickLendersWinner = (
  eligible: MarketAccount[],
  bucket: RecentDepositsData,
) =>
  pickMax(eligible, (account) => {
    const stats = bucket[account.market.address.toLowerCase()]
    return stats && stats.uniqueLenders > 0 ? stats.uniqueLenders : undefined
  })

const pickTotalDepositedWinner = (eligible: MarketAccount[]) =>
  pickMax(eligible, (account) => {
    const raw = account.market.totalDeposited?.raw
    if (!raw) return undefined
    const big = raw.toBigInt()
    return big > ZERO ? big : undefined
  })

type Slot = {
  key: string
  account: MarketAccount
  lenderCount: number
  formattedStat?: string
}

export const TrendingMarketsCarousel = () => {
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()
  const { data: recentDeposits } = useRecentDeposits()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const slots = useMemo<Slot[]>(() => {
    const eligible = marketAccounts.filter(
      (a) => !a.market.isClosed && a.market.maxTotalSupply.gt(0),
    )
    if (eligible.length === 0) return []

    const broadStats = (account: MarketAccount) =>
      recentDeposits.broad[account.market.address.toLowerCase()]

    const inflow7dWinner = pickInflowWinner(eligible, recentDeposits.last7d)
    const inflowLifetimeWinner = pickTotalDepositedWinner(eligible)

    const lenders7dWinner = pickLendersWinner(eligible, recentDeposits.last7d)
    const lendersBroadWinner = pickLendersWinner(eligible, recentDeposits.broad)

    const interestPaidWinner = pickMax(eligible, (account) => {
      const raw = account.market.totalBaseInterestAccrued?.raw
      if (!raw) return undefined
      const big = raw.toBigInt()
      return big > ZERO ? big : undefined
    })

    const aprWinner = pickMax(
      eligible,
      (account) => account.market.annualInterestBips,
    )

    const tvlWinner = pickMax(eligible, (account) => {
      const big = account.market.totalSupply.raw.toBigInt()
      return big > ZERO ? big : undefined
    })

    const makeSlot = (
      key: string,
      account: MarketAccount | undefined,
      formattedStat?: string,
    ): Slot | null => {
      if (!account) return null
      return {
        key,
        account,
        lenderCount: broadStats(account)?.uniqueLenders ?? 0,
        formattedStat,
      }
    }

    const tvlInflowAccount = inflow7dWinner ?? inflowLifetimeWinner
    let tvlInflowStat: string | undefined
    if (tvlInflowAccount) {
      const addr = tvlInflowAccount.market.address.toLowerCase()
      const { decimals } = tvlInflowAccount.market.underlyingToken
      const stats7d = recentDeposits.last7d[addr]
      if (stats7d && stats7d.totalAssetAmount > ZERO) {
        tvlInflowStat = `+${formatTokenCompact(
          stats7d.totalAssetAmount,
          decimals,
        )}`
      } else {
        const deposited = tvlInflowAccount.market.totalDeposited?.raw
        if (deposited) {
          const big = deposited.toBigInt()
          if (big > ZERO)
            tvlInflowStat = `+${formatTokenCompact(big, decimals)}`
        }
      }
    }

    let interestPaidStat: string | undefined
    if (interestPaidWinner) {
      const raw = interestPaidWinner.market.totalBaseInterestAccrued?.raw
      if (raw) {
        const big = raw.toBigInt()
        if (big > ZERO) {
          interestPaidStat = formatTokenCompact(
            big,
            interestPaidWinner.market.underlyingToken.decimals,
          )
        }
      }
    }

    let tvlStat: string | undefined
    if (tvlWinner) {
      const big = tvlWinner.market.totalSupply.raw.toBigInt()
      if (big > ZERO) {
        tvlStat = formatTokenCompact(
          big,
          tvlWinner.market.underlyingToken.decimals,
        )
      }
    }

    const built: (Slot | null)[] = [
      makeSlot("tvlInflow", tvlInflowAccount, tvlInflowStat),
      makeSlot("lenders", lenders7dWinner ?? lendersBroadWinner),
      makeSlot("interestPaid", interestPaidWinner, interestPaidStat),
      makeSlot("highestApr", aprWinner),
      makeSlot("highestTvl", tvlWinner, tvlStat),
    ]

    return built.filter((s): s is Slot => s !== null).slice(0, SLOT_COUNT)
  }, [marketAccounts, recentDeposits])

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="title3"
        sx={{ color: COLORS.blackRock, paddingLeft: "16px" }}
      >
        Trending Markets
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          padding: "20px 0 4px",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
              (key, index) => (
                <Skeleton
                  key={key}
                  height="136px"
                  width="304px"
                  sx={{
                    minWidth: "304px",
                    borderRadius: "12px",
                    bgcolor: COLORS.athensGrey,
                    ...(index === 0 && { marginLeft: "16px" }),
                    ...(index === 4 && { marginRight: "16px" }),
                  }}
                />
              ),
            )
          : slots.map((slot, index) => {
              const { market } = slot.account
              const borrower = (borrowers ?? []).find(
                (b) =>
                  b.address.toLowerCase() === market.borrower.toLowerCase(),
              )
              const borrowerName = borrower
                ? borrower.alias ||
                  borrower.name ||
                  trimAddress(market.borrower)
                : trimAddress(market.borrower)

              const commonProps = {
                marketAddress: market.address,
                chainId: market.chainId,
                borrowerName,
                asset: market.underlyingToken.symbol,
                apr: market.annualInterestBips,
              }

              let card: React.ReactNode
              switch (slot.key) {
                case "tvlInflow":
                  card = (
                    <TrendingMarketCardInflow
                      {...commonProps}
                      inflow={slot.formattedStat ?? "—"}
                    />
                  )
                  break
                case "lenders":
                  card = (
                    <TrendingMarketCardLenders
                      {...commonProps}
                      lenderCount={slot.lenderCount}
                    />
                  )
                  break
                case "interestPaid":
                  card = (
                    <TrendingMarketCardInterestPaid
                      {...commonProps}
                      interestPaid={slot.formattedStat ?? "—"}
                    />
                  )
                  break
                case "highestApr":
                  card = <TrendingMarketCardApr {...commonProps} />
                  break
                case "highestTvl":
                  card = (
                    <TrendingMarketCardTvl
                      {...commonProps}
                      totalSupply={slot.formattedStat ?? "—"}
                    />
                  )
                  break
                default:
                  card = null
              }

              return (
                <Box
                  key={slot.key}
                  sx={{
                    flexShrink: 0,
                    width: "304px",
                    ...(index === 0 && { marginLeft: "16px" }),
                    ...(index === slots.length - 1 && { marginRight: "16px" }),
                  }}
                >
                  {card}
                </Box>
              )
            })}
      </Box>
    </Box>
  )
}
