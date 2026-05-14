"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "viem"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import {
  RecentDepositsData,
  useRecentDeposits,
} from "@/app/[locale]/lender/hooks/useRecentDeposits"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { formatBps, trimAddress } from "@/utils/formatters"
import { isExploreVisible } from "@/utils/marketStatus"

import {
  TrendingMarketCard,
  TrendingMarketCardVariant,
} from "./TrendingMarketCard"

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
  variant: TrendingMarketCardVariant
  description: string
  account: MarketAccount
  value: string
}

const useDragScroll = () => {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    drag.current = {
      active: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    }
    el.style.cursor = "grabbing"
    el.style.userSelect = "none"
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.active || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    ref.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX)
  }, [])

  const stopDrag = useCallback(() => {
    drag.current.active = false
    if (!ref.current) return
    ref.current.style.cursor = "grab"
    ref.current.style.userSelect = ""
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    // eslint-disable-next-line consistent-return
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: stopDrag,
    onMouseLeave: stopDrag,
  }
}

export const TrendingMarketsCarousel = () => {
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()
  const { data: recentDeposits } = useRecentDeposits()
  const dragScroll = useDragScroll()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const slots = useMemo<Slot[]>(() => {
    const eligible = marketAccounts.filter(
      (a) => isExploreVisible(a.market) && a.market.maxTotalSupply.gt(0),
    )
    if (eligible.length === 0) return []

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

    const lendersAccount = lenders7dWinner ?? lendersBroadWinner
    const lendersCount = lendersAccount
      ? recentDeposits.last7d[lendersAccount.market.address.toLowerCase()]
          ?.uniqueLenders ?? 0
      : 0

    const makeSlot = (
      key: string,
      variant: TrendingMarketCardVariant,
      description: string,
      account: MarketAccount | undefined,
      value: string | undefined,
    ): Slot | null => {
      if (!account || !value) return null
      return { key, variant, description, account, value }
    }

    const built: (Slot | null)[] = [
      makeSlot(
        "tvlInflow",
        "trending",
        "fresh capital this week",
        tvlInflowAccount,
        tvlInflowStat,
      ),
      makeSlot(
        "lenders",
        "popular",
        "lenders joined this week",
        lendersAccount,
        lendersCount > 0 ? lendersCount.toString() : undefined,
      ),
      makeSlot(
        "interestPaid",
        "proven",
        "paid in total to lenders, all time",
        interestPaidWinner,
        interestPaidStat,
      ),
      makeSlot(
        "highestApr",
        "hotRate",
        "current APR, best in market",
        aprWinner,
        aprWinner
          ? `${formatBps(aprWinner.market.annualInterestBips)}%`
          : undefined,
      ),
      makeSlot(
        "highestTvl",
        "topFunded",
        "total value locked",
        tvlWinner,
        tvlStat,
      ),
    ]

    return built.filter((s): s is Slot => s !== null).slice(0, SLOT_COUNT)
  }, [marketAccounts, recentDeposits])

  const isMobile = useMobileResolution()

  const renderCard = (slot: Slot) => {
    const { market } = slot.account
    const borrower = (borrowers ?? []).find(
      (b) => b.address.toLowerCase() === market.borrower.toLowerCase(),
    )
    const borrowerName = borrower
      ? borrower.alias || borrower.name || trimAddress(market.borrower)
      : trimAddress(market.borrower)

    return (
      <TrendingMarketCard
        variant={slot.variant}
        value={slot.value}
        description={slot.description}
        marketAddress={market.address}
        chainId={market.chainId}
        borrowerName={borrowerName}
        borrowerAddress={market.borrower.toLowerCase()}
        asset={market.underlyingToken.symbol}
        apr={market.annualInterestBips}
      />
    )
  }

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          borderRadius: "14px",
          backgroundColor: COLORS.white,
          overflow: "hidden",
        }}
      >
        <Typography variant="mobH3" sx={{ padding: "16px 16px 8px 16px" }}>
          Trending Markets
        </Typography>

        <Box
          ref={dragScroll.ref}
          onMouseDown={dragScroll.onMouseDown}
          onMouseMove={dragScroll.onMouseMove}
          onMouseUp={dragScroll.onMouseUp}
          onMouseLeave={dragScroll.onMouseLeave}
          sx={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            marginBottom: "8px",
            cursor: "grab",
          }}
        >
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
                (key, index) => (
                  <Skeleton
                    key={key}
                    height="182px"
                    width="220px"
                    sx={{
                      minWidth: "220px",
                      borderRadius: "12px",
                      bgcolor: COLORS.athensGrey,
                      ...(index === 0 && { marginLeft: "8px" }),
                      ...(index === 4 && { marginRight: "8px" }),
                    }}
                  />
                ),
              )
            : slots.map((slot, index) => (
                <Box
                  key={slot.key}
                  sx={{
                    flexShrink: 0,
                    display: "flex",
                    width: "220px",
                    ...(index === 0 && { marginLeft: "8px" }),
                    ...(index === slots.length - 1 && {
                      marginRight: "8px",
                    }),
                  }}
                >
                  {renderCard(slot)}
                </Box>
              ))}
        </Box>
      </Box>
    )

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="title3"
        sx={{ color: COLORS.blackRock, paddingLeft: "16px" }}
      >
        Trending Markets
      </Typography>

      <Box
        ref={dragScroll.ref}
        onMouseDown={dragScroll.onMouseDown}
        onMouseMove={dragScroll.onMouseMove}
        onMouseUp={dragScroll.onMouseUp}
        onMouseLeave={dragScroll.onMouseLeave}
        sx={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          padding: "20px 0 4px",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          cursor: "grab",
        }}
      >
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
              (key, index) => (
                <Skeleton
                  key={key}
                  height="172px"
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
          : slots.map((slot, index) => (
              <Box
                key={slot.key}
                sx={{
                  flexShrink: 0,
                  width: "304px",
                  ...(index === 0 && { marginLeft: "16px" }),
                  ...(index === slots.length - 1 && { marginRight: "16px" }),
                }}
              >
                {renderCard(slot)}
              </Box>
            ))}
      </Box>
    </Box>
  )
}
