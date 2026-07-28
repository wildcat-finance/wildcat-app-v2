"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import { TrendingMarketDetails } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel/TrendingMarketsCard/BorrowerBlock"
import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { buildMarketHref, formatBps } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"

import {
  CardContainerStyle,
  CardContentStyle,
  CardHeaderStyle,
  CardIconStyle,
  MarketContainerStyle,
  StatStyle,
} from "./style"

export type TrendingMarketCardVariant =
  | "trending"
  | "popular"
  | "trackRecord"
  | "hotRate"
  | "topFunded"

const VARIANT_BADGE: Record<
  TrendingMarketCardVariant,
  {
    label: string
    context: string
    accent: string
    iconColor: string
    Icon: typeof TrendingIcon
  }
> = {
  trending: {
    label: "Trending",
    context: "Last 7 days",
    accent: "#CBD7FF",
    iconColor: "#B6C8FF",
    Icon: TrendingIcon,
  },
  popular: {
    label: "Popular",
    context: "Last 7 days",
    accent: "#BEEFD7",
    iconColor: "#2ACA7C",
    Icon: PopularIcon,
  },
  trackRecord: {
    label: "Total Paid Out",
    context: "All time",
    accent: "#D7C9FD",
    iconColor: "#7547F5",
    Icon: ProvenIcon,
  },
  hotRate: {
    label: "Peak APR",
    context: "Highest market",
    accent: "#FDCEB6",
    iconColor: "#F5651D",
    Icon: HotRateIcon,
  },
  topFunded: {
    label: "Top Funded",
    context: "Largest market",
    accent: "#BFE7FD",
    iconColor: "#48B5F4",
    Icon: TopFundedIcon,
  },
}

type TrendingMarketCardProps = {
  variant: TrendingMarketCardVariant
  value: string
  marketName: string
  marketAddress: string
  chainId?: number
  borrowerName: string
  asset: string
  apr: number
  supplied: string
  capacity: string
  suppliedPct: number
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
  termDetail: string
}

export const TrendingMarketCard = ({
  variant,
  value,
  marketName,
  marketAddress,
  chainId,
  borrowerName,
  asset,
  apr,
  supplied,
  capacity,
  suppliedPct,
  status,
  termLabel,
  termDetail,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]

  let statisticLabel: string
  if (variant === "popular") {
    statisticLabel = `${
      Number(value) === 1 ? "new lender" : "new lenders"
    } joined`
  } else if (variant === "trackRecord") {
    statisticLabel = `${asset} interest paid`
  } else if (variant === "hotRate") {
    statisticLabel = "best base APR"
  } else {
    statisticLabel = `${asset} deposited`
  }

  return (
    <Box
      sx={{
        ...CardContainerStyle,
        borderTop: {
          xs: `3px solid ${badge.accent}`,
          md: `2px solid ${badge.accent}`,
        },
      }}
    >
      <Box sx={CardHeaderStyle}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: "10px", md: "7px" },
          }}
        >
          <SvgIcon
            component={badge.Icon}
            sx={{
              ...CardIconStyle,
              '& [fill="#30313E"]': { fill: badge.iconColor },
            }}
          />
          <Typography
            sx={{
              color: COLORS.black,
              fontSize: { xs: "14px", md: pxToRem(10) },
              fontWeight: 600,
              letterSpacing: "0.07em",
              lineHeight: { xs: "20px", md: lh(14, 10) },
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {badge.label}
          </Typography>
        </Box>

        <Typography
          sx={{
            color: COLORS.matteSilver,
            fontSize: { xs: "14px", md: pxToRem(9) },
            lineHeight: { xs: "20px", md: lh(14, 9) },
            whiteSpace: "nowrap",
          }}
        >
          {badge.context}
        </Typography>
      </Box>

      <Box sx={CardContentStyle}>
        <Box sx={StatStyle}>
          <Typography
            sx={{
              color: COLORS.black,
              fontSize: { xs: "32px", md: pxToRem(20) },
              fontWeight: 500,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </Typography>
          <Typography
            sx={{
              minWidth: 0,
              overflow: "hidden",
              color: COLORS.blackRock,
              fontSize: { xs: "16px", md: pxToRem(10) },
              lineHeight: { xs: "22px", md: lh(14, 10) },
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {statisticLabel}
          </Typography>
        </Box>

        <TrendingMarketDetails
          marketName={marketName}
          borrower={borrowerName}
          apr={apr}
          suppliedPct={suppliedPct}
          supplied={supplied}
          capacity={capacity}
          status={status}
          termLabel={termLabel}
          termDetail={termDetail}
        />

        <Box
          component={Link}
          href={buildMarketHref(marketAddress, chainId)}
          sx={{
            ...MarketContainerStyle,
            justifyContent: "space-between",
          }}
        >
          <>
            <Typography
              sx={{
                color: COLORS.white,
                fontSize: { xs: "18px", md: "11px" },
                fontWeight: 500,
              }}
            >
              Earn {formatBps(apr)}% APR
            </Typography>
            <Typography
              sx={{
                color: COLORS.white,
                fontSize: { xs: "18px", md: "11px" },
                fontWeight: 600,
              }}
            >
              Deposit
            </Typography>
          </>
        </Box>
      </Box>
    </Box>
  )
}
