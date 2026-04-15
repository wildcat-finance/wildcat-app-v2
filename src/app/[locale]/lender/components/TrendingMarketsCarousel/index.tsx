"use client"

import { useMemo } from "react"

import { Box, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { TrendingMarketCard } from "./TrendingMarketCard"

const TRENDING_COUNT = 10

const formatCompactAmount = (amount: TokenAmount): string => {
  const num = parseFloat(amount.toFixed(2))
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toFixed(0)
}

const getUtilization = (
  totalSupply: TokenAmount,
  maxTotalSupply: TokenAmount,
): number => {
  const maxNum = parseFloat(maxTotalSupply.toFixed(4))
  if (maxNum === 0) return 0
  const totalNum = parseFloat(totalSupply.toFixed(4))
  return Math.round((totalNum / maxNum) * 100)
}

export const TrendingMarketsCarousel = () => {
  const { marketAccounts, borrowers } = useLenderMarketsContext()

  const trendingMarkets = useMemo(
    () =>
      marketAccounts
        .filter((a) => !a.market.isClosed && a.market.maxTotalSupply.gt(0))
        .map((account) => {
          const { market } = account
          const utilization = getUtilization(
            market.totalSupply,
            market.maxTotalSupply,
          )
          return { account, utilization }
        })
        .sort((a, b) => b.utilization - a.utilization)
        .slice(0, TRENDING_COUNT)
        .map(({ account, utilization }) => {
          const { market } = account
          const {
            address,
            borrower: borrowerAddress,
            underlyingToken,
            annualInterestBips,
            totalSupply,
            chainId,
          } = market

          const borrower = (borrowers ?? []).find(
            (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
          )
          const borrowerName = borrower
            ? borrower.alias || borrower.name || trimAddress(borrowerAddress)
            : trimAddress(borrowerAddress)

          return {
            marketAddress: address,
            chainId,
            borrowerName,
            asset: underlyingToken.symbol,
            apr: annualInterestBips,
            statHighlight: formatCompactAmount(totalSupply),
            statLabel: `${underlyingToken.symbol} supplied · ${utilization}% filled`,
          }
        }),
    [marketAccounts, borrowers],
  )

  if (trendingMarkets.length === 0) return null

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="title3" sx={{ color: COLORS.blackRock }}>
        Trending Markets
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          padding: "32px 0 4px",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {trendingMarkets.map((market) => (
          <Box
            key={market.marketAddress}
            sx={{ flexShrink: 0, width: "304px" }}
          >
            <TrendingMarketCard
              marketAddress={market.marketAddress}
              chainId={market.chainId}
              borrowerName={market.borrowerName}
              asset={market.asset}
              apr={market.apr}
              statHighlight={market.statHighlight}
              statLabel={market.statLabel}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
