"use client"

import { useMemo, useState } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { tokenAmountComparator } from "@/utils/comparators"
import { buildMarketHref, formatBps, trimAddress } from "@/utils/formatters"
import { isExploreVisible } from "@/utils/marketStatus"

const SORT_OPTIONS = ["Highest Yield", "Most Funded", "Most Liquid"] as const
type SortOption = (typeof SORT_OPTIONS)[number]

const BADGE_STYLES = [
  { bgcolor: "rgba(40, 202, 124, 0.13)", color: "#1A955A" },
  { bgcolor: "rgba(62, 104, 255, 0.10)", color: "#3D68FF" },
  { bgcolor: COLORS.whiteSmoke, color: COLORS.blackRock07 },
] as const

const formatCompact = (amount: TokenAmount): string => {
  const value = parseFloat(amount.format(amount.decimals))
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

type MarketCardData = {
  id: string
  chainId?: number
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  apr: number
  totalSupply: TokenAmount
  maxTotalSupply: TokenAmount
  badgeBgcolor: string
  badgeColor: string
  badgeText: string
  isMobile?: boolean
}

const MarketCard = ({
  id,
  chainId,
  name,
  borrower,
  borrowerAddress,
  asset,
  apr,
  totalSupply,
  maxTotalSupply,
  badgeBgcolor,
  badgeColor,
  badgeText,
  isMobile,
}: MarketCardData) => (
  <Box
    sx={{
      position: "relative",
      pt: "44px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        bgcolor: badgeBgcolor,
        borderRadius: "20px",
        px: "24px",
        py: "8px",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <Typography
        sx={{
          color: badgeColor,
          fontSize: "16px",
          fontWeight: 500,
          lineHeight: "32px",
        }}
      >
        {badgeText}
      </Typography>
    </Box>

    <Box
      sx={{
        position: "relative",
        zIndex: 2,
        flex: 1,
        bgcolor: COLORS.white,
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "20px",
        p: isMobile ? "16px" : "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "8px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <Typography
            sx={{
              fontSize: "18px",
              fontWeight: 600,
              lineHeight: isMobile ? "24px" : "28px",
              letterSpacing: "0",
            }}
          >
            {name}
          </Typography>

          <Box sx={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <Box
              sx={{
                bgcolor: COLORS.whiteSmoke,
                borderRadius: "20px",
                px: "8px",
                py: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  color: COLORS.blackRock,
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: 500,
                  lineHeight: "24px",
                }}
              >
                {asset}
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: COLORS.whiteSmoke,
                borderRadius: "20px",
                px: "8px",
                py: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  color: COLORS.blackRock,
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: 500,
                  lineHeight: "24px",
                }}
              >
                {formatBps(apr)}% APY
              </Typography>
            </Box>
          </Box>
        </Box>

        {borrowerAddress && (
          <Box
            sx={{
              width: "fit-content",
              display: "flex",
              p: "0 8px 0 4px",
              borderRadius: "12px",
              alignItems: "flex-start",
              gap: "6px",
              bgcolor: COLORS.whiteSmoke,
            }}
          >
            <Box
              sx={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                bgcolor: "#4CA6D9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
                mt: "4px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "8px",
                  color: COLORS.white,
                  textAlign: "center",
                }}
              >
                {borrower?.startsWith("0") ? "W" : borrower?.trim()?.[0]}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: isMobile ? "14px" : "16px",
                fontWeight: 500,
                lineHeight: "24px",
              }}
            >
              {borrower}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pt: "20px",
        }}
      >
        <Typography
          sx={{
            color: "#858593",
            fontSize: isMobile ? "14px" : "16px",
            fontWeight: 500,
            lineHeight: "24px",
          }}
        >
          {formatCompact(totalSupply)} / {formatCompact(maxTotalSupply)}{" "}
          supplied
        </Typography>

        <Box
          component={Link}
          target="_blank"
          href={buildMarketHref(
            id,
            chainId,
            "https://app.wildcat.finance/lender/market",
          )}
          sx={{
            bgcolor: "#121212",
            borderRadius: "12px",
            px: "20px",
            py: "12px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="text1"
            sx={{
              color: COLORS.white,
              fontWeight: 600,
              whiteSpace: "nowrap",
              fontSize: isMobile ? "12px" : "16px",
            }}
          >
            Go to market
          </Typography>
        </Box>
      </Box>
    </Box>
  </Box>
)

type TopMarketsSectionNewProps = {
  markets: Market[]
  borrowers: BorrowerWithName[] | undefined
  isLoading: boolean
  badges?: [string, string, string]
}

export const TopMarketsSectionNew = ({
  markets,
  borrowers,
  isLoading,
  badges,
}: TopMarketsSectionNewProps) => {
  const isMobile = useMobileResolution()
  const [sortMode, setSortMode] = useState<SortOption>("Highest Yield")

  const { topMarkets, defaultBadges } = useMemo(() => {
    const active = markets.filter((m) => isExploreVisible(m))

    const sorted = [...active].sort((a, b) => {
      if (sortMode === "Highest Yield") {
        return b.annualInterestBips - a.annualInterestBips
      }
      if (sortMode === "Most Liquid") {
        const capA = a.maxTotalSupply.sub(a.totalSupply)
        const capB = b.maxTotalSupply.sub(b.totalSupply)
        return tokenAmountComparator(capB, capA)
      }
      return tokenAmountComparator(b.totalSupply, a.totalSupply)
    })

    const top3 = sorted.slice(0, 3)

    const cards: MarketCardData[] = top3.map((market, index) => {
      const borrowerProfile = (borrowers ?? []).find(
        (b) => b.address.toLowerCase() === market.borrower.toLowerCase(),
      )
      return {
        id: market.address,
        chainId: market.chainId,
        name: market.name,
        borrower: borrowerProfile
          ? borrowerProfile.alias || borrowerProfile.name
          : trimAddress(market.borrower),
        borrowerAddress: market.borrower,
        asset: market.underlyingToken.symbol,
        apr: market.annualInterestBips,
        totalSupply: market.totalSupply,
        maxTotalSupply: market.maxTotalSupply,
        badgeBgcolor: BADGE_STYLES[index].bgcolor,
        badgeColor: BADGE_STYLES[index].color,
        badgeText:
          // eslint-disable-next-line no-nested-ternary
          sortMode === "Highest Yield"
            ? `Top ${index + 1}: ${formatBps(market.annualInterestBips)}% APY`
            : sortMode === "Most Funded"
              ? `Top ${index + 1}: ${formatCompact(market.totalSupply)} funded`
              : `Top ${index + 1}: ${formatCompact(
                  market.maxTotalSupply.sub(market.totalSupply),
                )} available`,
      }
    })

    const maxApr =
      active.length > 0
        ? Math.max(...active.map((m) => m.annualInterestBips))
        : 0

    const computed: [string, string, string] = [
      `Top yield: ${formatBps(cards[0]?.apr ?? 0)} APY`,
      `${active.length} active markets`,
      `Up to ${formatBps(maxApr)} APY`,
    ]

    return { topMarkets: cards, defaultBadges: computed }
  }, [markets, borrowers, sortMode])

  return (
    <Box sx={{ width: "100%", bgcolor: COLORS.white }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: "53px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "4px",
            justifyContent: isMobile ? "flex-start" : "center",
            alignItems: "center",
            px: "16px",
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <Box
              key={option}
              onClick={() => setSortMode(option)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: "16px",
                py: isMobile ? "6px" : "8px",
                borderRadius: "20px",
                bgcolor: sortMode === option ? "#4971FF" : "transparent",
                cursor: "pointer",
              }}
            >
              <Typography
                variant="text1"
                sx={{
                  fontSize: isMobile ? "12px" : "16px",
                  color: sortMode === option ? COLORS.white : COLORS.blackRock,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {option}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: "18px",
          px: { xs: "16px", md: "80px" },
        }}
      >
        {isLoading
          ? [0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <Skeleton
                  variant="rectangular"
                  sx={{ height: "258px", borderRadius: "20px" }}
                />
              </Box>
            ))
          : topMarkets.map((market) => (
              <MarketCard key={market.id} {...market} isMobile={isMobile} />
            ))}
      </Box>

      <Box
        component={Link}
        target="_blank"
        href="https://app.wildcat.finance/lender"
        sx={{
          mt: "24px",
          mx: "auto",
          width: "fit-content",
          bgcolor: COLORS.whiteSmoke,
          borderRadius: "12px",
          px: "20px",
          py: "12px",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Typography
          variant="text1"
          sx={{ color: COLORS.blackRock, fontWeight: 600 }}
        >
          See all markets
        </Typography>
      </Box>
    </Box>
  )
}
