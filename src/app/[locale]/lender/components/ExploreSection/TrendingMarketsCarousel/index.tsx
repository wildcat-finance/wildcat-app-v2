"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { HooksKind, MarketAccount } from "@wildcatfi/wildcat-sdk"
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

const useDragScroll = () => {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })
  const [isScrollable, setIsScrollable] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setIsScrollable(el.scrollWidth > el.clientWidth)
  }, [])

  // Content swaps (skeletons ↔ cards) change scrollWidth without resizing
  // the container, so re-measure after every render; the observer covers
  // container resizes that happen without one (e.g. window resizes)
  useEffect(measure)

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
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()
  const { data: recentDeposits } = useRecentDeposits()
  const { isMarketQualifying, isLoading: isInflowLoading } =
    useMarketsWithRecentInflow()
  const dragScroll = useDragScroll()
  const [activeMobileSlot, setActiveMobileSlot] = useState(0)

  const handleMobileScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget
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
      setActiveMobileSlot(closestIndex)
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

    const inflow7dWinner = pickMax(eligible, (account) => {
      const stats = recentDeposits.last7d[account.market.address.toLowerCase()]
      return stats && stats.totalAssetAmount > ZERO
        ? marketUsdScore(account, stats.totalAssetAmount)
        : undefined
    })
    const inflowLifetimeWinner = pickMax(eligible, (account) => {
      const raw = account.market.totalDeposited?.raw
      if (!raw) return undefined
      const big = raw.toBigInt()
      return big > ZERO ? marketUsdScore(account, big) : undefined
    })

    const lenders7dWinner = pickLendersWinner(eligible, recentDeposits.last7d)
    const lendersBroadWinner = pickLendersWinner(eligible, recentDeposits.broad)

    const interestPaidWinner = pickMax(eligible, (account) => {
      const raw = account.market.totalBaseInterestAccrued?.raw
      if (!raw) return undefined
      const big = raw.toBigInt()
      return big > ZERO ? marketUsdScore(account, big) : undefined
    })

    const healthyEligible = eligible.filter((a) => isMarketHealthy(a.market))
    const aprWinner = [...healthyEligible].sort(
      compareByCurrentAprBestInMarket,
    )[0]

    const tvlWinner = pickMax(eligible, (account) => {
      const big = account.market.totalSupply.raw.toBigInt()
      return big > ZERO ? marketUsdScore(account, big) : undefined
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
      account: MarketAccount | undefined,
      value: string | undefined,
    ): Slot | null => {
      if (!account || !value) return null
      return { key, variant, account, value }
    }

    const built: (Slot | null)[] = [
      makeSlot("tvlInflow", "trending", tvlInflowAccount, tvlInflowStat),
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
      makeSlot(
        "interestPaid",
        "trackRecord",
        interestPaidWinner,
        interestPaidStat,
      ),
      makeSlot("highestTvl", "topFunded", tvlWinner, tvlStat),
    ]

    return built.filter((s): s is Slot => s !== null).slice(0, SLOT_COUNT)
  }, [
    marketAccounts,
    recentDeposits,
    priceMap,
    isLoadingUpdate,
    isMarketQualifying,
  ])

  const isLoading = isLoadingInitial || isLoadingUpdate || isInflowLoading

  const isMobile = useMobileResolution()

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
      (b) => b.address.toLowerCase() === market.borrower.toLowerCase(),
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
        marketName={market.name}
        marketAddress={market.address}
        chainId={market.chainId}
        borrowerName={borrowerName}
        asset={market.underlyingToken.symbol}
        apr={market.annualInterestBips}
        supplied={formatTokenCompact(suppliedRaw, decimals)}
        capacity={formatTokenCompact(capacityRaw, decimals)}
        suppliedPct={suppliedPct}
        status={getMarketStatusChip(market)}
        termLabel={termLabel}
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
          backgroundColor: "transparent",
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
                    height="404px"
                    sx={{
                      flex: "0 0 70%",
                      minWidth: "222px",
                      borderRadius: "12px",
                      bgcolor: COLORS.athensGrey,
                      scrollSnapAlign: "center",
                      scrollSnapStop: "always",
                      ...(index === 0 && { marginLeft: "24px" }),
                      ...(index === 4 && { marginRight: "36px" }),
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
                    ...(index === 0 && { marginLeft: "24px" }),
                    ...(index === slots.length - 1 && {
                      marginRight: "36px",
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
              gap: "6px",
              padding: "16px 0 20px",
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
                    width: isActive ? "26px" : "8px",
                    height: "8px",
                    flexShrink: 0,
                    padding: 0,
                    border: 0,
                    borderRadius: "4px",
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
