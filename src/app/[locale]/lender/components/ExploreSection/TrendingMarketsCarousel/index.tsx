"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { HooksKind, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "viem"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { useMarketsWithRecentInflow } from "@/app/[locale]/lender/hooks/useMarketsWithRecentInflow"
import {
  RecentDepositsData,
  useRecentDeposits,
} from "@/app/[locale]/lender/hooks/useRecentDeposits"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { toHuman } from "@/lib/protocol-stats/format"
import { COLORS } from "@/theme/colors"
import { formatBps, trimAddress } from "@/utils/formatters"
import { compareByCurrentAprBestInMarket } from "@/utils/marketSort"
import {
  getMarketStatusChip,
  getPenaltyBorrowers,
  isExploreVisible,
  isMarketHealthy,
} from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import {
  TrendingMarketCard,
  TrendingMarketCardVariant,
} from "./TrendingMarketsCard"
import { useTrendingUsdPrices } from "./useTrendingUsdPrices"

const SLOT_COUNT = 5

const ZERO = BigInt(0)

const compactFormat = (num: number): string =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
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

const pickLendersWinner = (
  eligible: MarketAccount[],
  bucket: RecentDepositsData,
) =>
  pickMax(eligible, (account) => {
    const stats = bucket[account.market.address.toLowerCase()]
    return stats && stats.uniqueLenders > 0 ? stats.uniqueLenders : undefined
  })

type Slot = {
  key: string
  variant: TrendingMarketCardVariant
  account: MarketAccount
  value: string
  secondaryValue?: string
}

const SECONDS_IN_YEAR = BigInt(365 * 24 * 60 * 60)
const BIPS = BigInt(10_000)

// Subgraph market state is as-of the market's last on-chain interest accrual,
// which for a dormant market can be days old. Project supply linearly to now
// (mirroring the contract's between-update accrual) so a market that is
// actually at capacity can't win Peak APR off a stale below-cap snapshot.
// The lender-only live refresh doesn't carry market state, so this projection
// is the only client-side capacity correction.
const isBelowProjectedCapacity = (market: Market): boolean => {
  const capacity = market.maxTotalSupply.raw.toBigInt()
  const supply = market.totalSupply.raw.toBigInt()
  const elapsed = BigInt(
    Math.max(
      0,
      Math.floor(Date.now() / 1000) - market.lastInterestAccruedTimestamp,
    ),
  )
  const rateBips = BigInt(
    market.annualInterestBips +
      (market.timeDelinquent > market.delinquencyGracePeriod
        ? market.delinquencyFeeBips
        : 0),
  )
  const projectedSupply =
    supply + (supply * rateBips * elapsed) / (BIPS * SECONDS_IN_YEAR)
  return projectedSupply < capacity
}

const formatMaturityDate = (millisecondsFromNow: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
    .format(Date.now() + millisecondsFromNow)
    .replaceAll("/", ".")

const formatWithdrawalCycle = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  return hours > 0 ? `${hours}h` : "<1h"
}

const formatGrowthPct = (ratio: number): string => {
  // Beyond +1000% a percentage stops being readable - show a multiplier
  if (ratio >= 10) return `${compactFormat(Math.round(ratio))}x`
  const pct = ratio * 100
  return `${pct >= 10 ? Math.round(pct).toString() : pct.toFixed(1)}%`
}

const formatMarketAge = (deployedTimestamp: number): string => {
  const ageSeconds = Math.max(
    0,
    Math.floor(Date.now() / 1000) - deployedTimestamp,
  )
  const days = Math.floor(ageSeconds / 86400)
  if (days >= 1) return `${days}d ago`
  const hours = Math.floor(ageSeconds / 3600)
  return hours >= 1 ? `${hours}h ago` : "just now"
}

const useDragScroll = () => {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })
  const [isScrollable, setIsScrollable] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setIsScrollable(el.scrollWidth > el.clientWidth)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth) return
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
    ref.current.style.cursor = ""
    ref.current.style.userSelect = ""
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
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
    isScrollable,
    measure,
    onMouseDown,
    onMouseMove,
    onMouseUp: stopDrag,
    onMouseLeave: stopDrag,
  }
}

const PEEK_SESSION_KEY = "trending-markets-peek-shown"
const PEEK_ENTER_DELAY_MS = 200
const PEEK_HOLD_MS = 400
const PEEK_DISTANCE_PX = 150

const usePeekOnFirstVisit = (
  ref: React.RefObject<HTMLDivElement | null>,
  ready: boolean,
) => {
  useEffect(() => {
    if (!ready) return undefined
    if (typeof window === "undefined") return undefined
    if (window.sessionStorage.getItem(PEEK_SESSION_KEY)) return undefined
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return undefined

    const el = ref.current
    if (!el) return undefined
    if (el.scrollWidth <= el.clientWidth) return undefined

    window.sessionStorage.setItem(PEEK_SESSION_KEY, "1")

    const peekDistance = Math.min(
      PEEK_DISTANCE_PX,
      el.scrollWidth - el.clientWidth,
    )
    let cancelled = false

    const cancel = () => {
      cancelled = true
    }

    const enterTimeout = window.setTimeout(() => {
      if (cancelled) return
      el.scrollTo({ left: peekDistance, behavior: "smooth" })
    }, PEEK_ENTER_DELAY_MS)

    const returnTimeout = window.setTimeout(() => {
      if (cancelled) return
      el.scrollTo({ left: 0, behavior: "smooth" })
    }, PEEK_ENTER_DELAY_MS + PEEK_HOLD_MS)

    el.addEventListener("pointerdown", cancel, { once: true })
    el.addEventListener("wheel", cancel, { once: true, passive: true })
    el.addEventListener("touchstart", cancel, { once: true, passive: true })

    return () => {
      cancel()
      window.clearTimeout(enterTimeout)
      window.clearTimeout(returnTimeout)
      el.removeEventListener("pointerdown", cancel)
      el.removeEventListener("wheel", cancel)
      el.removeEventListener("touchstart", cancel)
    }
  }, [ref, ready])
}

export const TrendingMarketsCarousel = () => {
  const { marketAccounts, borrowers, isLoadingInitial } =
    useLenderMarketsContext()
  const { data: recentDeposits, isLoading: isRecentDepositsLoading } =
    useRecentDeposits()
  const { isMarketQualifying, isLoading: isInflowLoading } =
    useMarketsWithRecentInflow()
  const dragScroll = useDragScroll()
  const { measure: measureDragScroll } = dragScroll
  const [activeMobileSlot, setActiveMobileSlot] = useState(0)
  const mobileScrollFrame = useRef<number>()

  const handleMobileScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget
      if (mobileScrollFrame.current !== undefined) return

      mobileScrollFrame.current = window.requestAnimationFrame(() => {
        mobileScrollFrame.current = undefined
        const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2
        const cards = Array.from(
          scroller.querySelectorAll<HTMLElement>("[data-carousel-index]"),
        )

        let closestIndex = 0
        let closestDistance = Number.POSITIVE_INFINITY
        cards.forEach((card) => {
          const distance = Math.abs(
            card.offsetLeft + card.offsetWidth / 2 - viewportCenter,
          )
          if (distance < closestDistance) {
            closestDistance = distance
            closestIndex = Number(card.dataset.carouselIndex)
          }
        })
        setActiveMobileSlot((current) =>
          current === closestIndex ? current : closestIndex,
        )
      })
    },
    [],
  )

  useEffect(
    () => () => {
      if (mobileScrollFrame.current !== undefined) {
        window.cancelAnimationFrame(mobileScrollFrame.current)
      }
    },
    [],
  )

  const scrollToMobileSlot = useCallback(
    (index: number) => {
      const scroller = dragScroll.ref.current
      const card = scroller?.querySelector<HTMLElement>(
        `[data-carousel-index="${index}"]`,
      )
      if (!scroller || !card) return
      scroller.scrollTo({
        left: card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2,
        behavior: "smooth",
      })
    },
    [dragScroll.ref],
  )

  const { chainId } = useSelectedNetwork()
  const tokenAddresses = useMemo(
    () =>
      Array.from(
        new Set(
          marketAccounts.map((a) =>
            a.market.underlyingToken.address.toLowerCase(),
          ),
        ),
      ),
    [marketAccounts],
  )
  // Deliberately not part of the loading gate: prices can't start fetching
  // until the market catalogue lands, so waiting on them chains a third
  // request in front of first paint. They only weight the Top Funded ranking,
  // which re-sorts via the slots memo when the price map arrives.
  const { data: priceMap } = useTrendingUsdPrices(chainId, tokenAddresses)

  const slots = useMemo<Slot[]>(() => {
    const penaltyBorrowers = getPenaltyBorrowers(
      marketAccounts.map((a) => a.market),
    )

    const eligible = marketAccounts.filter(
      (a) =>
        isExploreVisible(a.market) &&
        a.market.maxTotalSupply.gt(0) &&
        !penaltyBorrowers.has(a.market.borrower.toLowerCase()) &&
        isMarketQualifying(a),
    )
    if (eligible.length === 0) return []

    const marketUsdScore = (account: MarketAccount, raw: bigint): number => {
      const { address, decimals } = account.market.underlyingToken
      const human = toHuman(raw, decimals)
      const price = priceMap?.[address.toLowerCase()]
      return price != null ? human * price : human
    }

    // PO metric: 7-day net inflow / total debt at window start. Window-start
    // debt is approximated as current supply minus the 7d net inflow (interest
    // accrued inside the window slightly inflates it). Markets whose entire
    // supply arrived inside the window are excluded - the ratio degenerates
    // to infinity there, and the Newest Market slot is the home for them.
    const growthScore = (account: MarketAccount): number | undefined => {
      const net =
        recentDeposits.netInflow7d[account.market.address.toLowerCase()]
      if (net === undefined || net <= ZERO) return undefined
      const startDebt = account.market.totalSupply.raw.toBigInt() - net
      if (startDebt <= ZERO) return undefined
      const { decimals } = account.market.underlyingToken
      return toHuman(net, decimals) / toHuman(startDebt, decimals)
    }
    const fastestGrowingWinner = pickMax(eligible, growthScore)
    const fastestGrowingRatio = fastestGrowingWinner
      ? growthScore(fastestGrowingWinner)
      : undefined
    const fastestGrowingStat = fastestGrowingWinner
      ? `+${formatTokenCompact(
          recentDeposits.netInflow7d[
            fastestGrowingWinner.market.address.toLowerCase()
          ] ?? ZERO,
          fastestGrowingWinner.market.underlyingToken.decimals,
        )}`
      : undefined
    const fastestGrowingRate = fastestGrowingRatio
      ? formatGrowthPct(fastestGrowingRatio)
      : undefined

    const lenders7dWinner = pickLendersWinner(eligible, recentDeposits.last7d)
    const lendersBroadWinner = pickLendersWinner(eligible, recentDeposits.broad)

    // Deliberately not gated on isMarketQualifying: a just-deployed market
    // has no deposits yet, which is exactly what makes it the newest.
    const newestEligible = marketAccounts.filter(
      (a) =>
        isExploreVisible(a.market) &&
        a.market.maxTotalSupply.gt(0) &&
        !penaltyBorrowers.has(a.market.borrower.toLowerCase()),
    )
    const newestWinner = pickMax(
      newestEligible,
      (account) => account.market.deployedEvent?.blockTimestamp || undefined,
    )
    const newestStat = newestWinner?.market.deployedEvent?.blockTimestamp
      ? formatMarketAge(newestWinner.market.deployedEvent.blockTimestamp)
      : undefined

    // Peak APR additionally requires projected supply below capacity: the
    // indexed below-cap check alone lets an actually-full dormant market win
    // with a bogus rate.
    const healthyEligible = eligible.filter(
      (a) => isMarketHealthy(a.market) && isBelowProjectedCapacity(a.market),
    )
    const aprWinner = healthyEligible.length
      ? [...healthyEligible].sort(compareByCurrentAprBestInMarket)[0]
      : undefined

    const tvlWinner = pickMax(eligible, (account) => {
      const big = account.market.totalSupply.raw.toBigInt()
      return big > ZERO ? marketUsdScore(account, big) : undefined
    })

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
      ? (lenders7dWinner ? recentDeposits.last7d : recentDeposits.broad)[
          lendersAccount.market.address.toLowerCase()
        ]?.uniqueLenders ?? 0
      : 0

    const makeSlot = (
      key: string,
      variant: TrendingMarketCardVariant,
      account: MarketAccount | undefined,
      value: string | undefined,
      secondaryValue?: string,
    ): Slot | null => {
      if (!account || !value) return null
      return { key, variant, account, value, secondaryValue }
    }

    const built: (Slot | null)[] = [
      makeSlot(
        "fastestGrowing",
        "fastestGrowing",
        fastestGrowingWinner,
        fastestGrowingStat,
        fastestGrowingRate,
      ),
      makeSlot(
        "lenders",
        "popular",
        lendersAccount,
        lendersCount > 0 ? lendersCount.toString() : undefined,
      ),
      makeSlot(
        "highestApr",
        "hotRate",
        aprWinner,
        aprWinner
          ? `${formatBps(aprWinner.market.annualInterestBips)}%`
          : undefined,
      ),
      makeSlot("newest", "newest", newestWinner, newestStat),
      makeSlot("highestTvl", "topFunded", tvlWinner, tvlStat),
    ]

    return built.filter((s): s is Slot => s !== null).slice(0, SLOT_COUNT)
  }, [marketAccounts, recentDeposits, priceMap, isMarketQualifying])

  const isLoading =
    isLoadingInitial || isInflowLoading || isRecentDepositsLoading

  const isMobile = useMobileResolution()

  useEffect(() => {
    measureDragScroll()
  }, [measureDragScroll, isLoading, isMobile, slots.length])

  useEffect(() => {
    setActiveMobileSlot((index) =>
      Math.min(index, Math.max(0, slots.length - 1)),
    )
  }, [slots.length])

  usePeekOnFirstVisit(
    dragScroll.ref,
    !isMobile && !isLoading && slots.length > 0,
  )

  const renderCard = (slot: Slot) => {
    const { market } = slot.account
    const borrower = (borrowers ?? []).find(
      (candidate) =>
        candidate.address.toLowerCase() === market.borrower.toLowerCase(),
    )
    const borrowerName = borrower
      ? borrower.alias || borrower.name || trimAddress(market.borrower)
      : trimAddress(market.borrower)

    const { decimals } = market.underlyingToken
    const suppliedRaw = market.totalSupply.raw.toBigInt()
    const capacityRaw = market.maxTotalSupply.raw.toBigInt()
    const suppliedPct =
      capacityRaw > ZERO
        ? Number((suppliedRaw * BigInt(10000)) / capacityRaw) / 100
        : 0
    const term = getMarketTypeChip(market)
    const isOpenTerm = term.kind === HooksKind.OpenTerm
    const termLabel = isOpenTerm
      ? `Open Term • ${formatWithdrawalCycle(market.withdrawalBatchDuration)}`
      : `Fixed Term • ${formatMaturityDate(term.fixedPeriod ?? 0)}`

    return (
      <TrendingMarketCard
        variant={slot.variant}
        value={slot.value}
        secondaryValue={slot.secondaryValue}
        marketName={market.name}
        marketAddress={market.address}
        chainId={market.chainId}
        borrowerName={borrowerName}
        borrowerAddress={market.borrower}
        asset={market.underlyingToken.symbol}
        apr={market.annualInterestBips}
        supplied={formatTokenCompact(suppliedRaw, decimals)}
        capacity={formatTokenCompact(capacityRaw, decimals)}
        suppliedPct={suppliedPct}
        status={getMarketStatusChip(market)}
        termLabel={termLabel}
        isMobile={isMobile}
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
          backgroundColor: COLORS.white,
          borderRadius: "14px 14px 0 0",
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            padding: "20px 16px 12px",
            fontSize: "20px",
            fontWeight: 500,
            lineHeight: "26px",
          }}
        >
          Trending Markets
        </Typography>

        <Box
          ref={dragScroll.ref}
          onMouseDown={dragScroll.onMouseDown}
          onMouseMove={dragScroll.onMouseMove}
          onMouseUp={dragScroll.onMouseUp}
          onMouseLeave={dragScroll.onMouseLeave}
          onScroll={handleMobileScroll}
          sx={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            scrollSnapType: "x mandatory",
            overscrollBehaviorX: "contain",
            cursor: dragScroll.isScrollable ? "grab" : "default",
          }}
        >
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
                (key, index) => (
                  <Skeleton
                    key={key}
                    height="341px"
                    sx={{
                      flex: "0 0 70%",
                      minWidth: "222px",
                      borderRadius: "24px",
                      bgcolor: COLORS.athensGrey,
                      scrollSnapAlign: "center",
                      scrollSnapStop: "always",
                      ...(index === 0 && { marginLeft: "8px" }),
                      ...(index === 4 && { marginRight: "16px" }),
                    }}
                  />
                ),
              )
            : slots.map((slot, index) => (
                <Box
                  key={slot.key}
                  data-carousel-index={index}
                  sx={{
                    flex: "0 0 70%",
                    minWidth: "222px",
                    display: "flex",
                    scrollSnapAlign: "center",
                    scrollSnapStop: "always",
                    ...(index === 0 && { marginLeft: "8px" }),
                    ...(index === slots.length - 1 && {
                      marginRight: "16px",
                    }),
                  }}
                >
                  {renderCard(slot)}
                </Box>
              ))}
        </Box>

        {!isLoading && slots.length > 1 && (
          <Box
            role="group"
            aria-label="Trending market position"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "10px 0 4px",
            }}
          >
            {slots.map((slot, index) => {
              const isActive = index === activeMobileSlot
              return (
                <Box
                  component="button"
                  key={slot.key}
                  type="button"
                  aria-label={`Show trending market ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => scrollToMobileSlot(index)}
                  sx={{
                    width: isActive ? "12px" : "4px",
                    height: "4px",
                    flexShrink: 0,
                    padding: 0,
                    border: 0,
                    borderRadius: "2px",
                    backgroundColor: isActive ? COLORS.bunker : COLORS.iron,
                    cursor: "pointer",
                    transition: "width 160ms ease, background-color 160ms ease",
                  }}
                />
              )
            })}
          </Box>
        )}
      </Box>
    )

  return (
    <Box sx={{ width: "100%", marginTop: "30px" }}>
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
          cursor: dragScroll.isScrollable ? "grab" : "default",
        }}
      >
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
              (key, index) => (
                <Skeleton
                  key={key}
                  height="297px"
                  sx={{
                    flex: "1 0 222px",
                    minWidth: "222px",
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
                  flex: "1 0 222px",
                  minWidth: "222px",
                  display: "flex",
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
