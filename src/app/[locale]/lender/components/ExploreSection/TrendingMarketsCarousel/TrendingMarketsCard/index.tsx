"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { TrendingMarketDetails } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel/TrendingMarketsCard/BorrowerBlock"
import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { NetworkIcon } from "@/components/NetworkIcon"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
    labelColor: string
    Icon: typeof TrendingIcon
  }
> = {
  trending: {
    label: "Trending",
    context: "Last 7 days",
    accent: "#CBD7FF",
    iconColor: "#B6C8FF",
    labelColor: "#4971FF",
    Icon: TrendingIcon,
  },
  popular: {
    label: "Popular",
    context: "Last 7 days",
    accent: "#BEEFD7",
    iconColor: "#2ACA7C",
    labelColor: "#2ACA7C",
    Icon: PopularIcon,
  },
  trackRecord: {
    label: "Total Paid Out",
    context: "All Time",
    accent: "#D7C9FD",
    iconColor: "#7547F5",
    labelColor: "#7547F5",
    Icon: ProvenIcon,
  },
  hotRate: {
    label: "Peak APR",
    context: "",
    accent: "#FDCEB6",
    iconColor: "#F5651D",
    labelColor: "#F5651D",
    Icon: HotRateIcon,
  },
  topFunded: {
    label: "Top Funded",
    context: "",
    accent: "#BFE7FD",
    iconColor: "#48B5F4",
    labelColor: "#48B5F4",
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
}: TrendingMarketCardProps) => {
  const isMobile = useMobileResolution()
  const badge = VARIANT_BADGE[variant]

  const statisticTitle = {
    trending: "Fresh Capital",
    popular: "Lenders Joined",
    trackRecord: "Paid In Total",
    hotRate: "Best In Market APR",
    topFunded: "Total Value Locked",
  }[variant]

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
              '& [fill="#30313E"]': {
                fill: { xs: badge.iconColor, md: badge.labelColor },
              },
            }}
          />
          <Typography
            sx={{
              color: { xs: COLORS.black, md: badge.labelColor },
              fontSize: { xs: "14px", md: pxToRem(11) },
              fontWeight: 600,
              lineHeight: { xs: "20px", md: lh(14, 11) },
              whiteSpace: "nowrap",
            }}
          >
            {badge.label}
          </Typography>
        </Box>

        {badge.context && (
          <Typography
            sx={{
              color: COLORS.matteSilver,
              fontSize: { xs: "14px", md: pxToRem(10) },
              lineHeight: { xs: "20px", md: lh(14, 10) },
              whiteSpace: "nowrap",
            }}
          >
            {badge.context}
          </Typography>
        )}
      </Box>

      <Box sx={CardContentStyle}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: "5px", md: "3px" },
            paddingBottom: { xs: "14px", md: "11px" },
            borderBottom: `1px solid ${COLORS.whiteLilac}`,
          }}
        >
          <Typography
            sx={{
              color: COLORS.blackRock,
              fontSize: { xs: "15px", md: "11px" },
              lineHeight: { xs: "20px", md: "14px" },
            }}
          >
            {statisticTitle}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: "6px", md: "5px" },
            }}
          >
            <Typography
              sx={{
                color: COLORS.black,
                fontSize: { xs: "30px", md: "20px" },
                fontWeight: 500,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </Typography>
            {variant !== "popular" && variant !== "hotRate" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: { xs: 0, md: "2px 7px 2px 5px" },
                  borderRadius: "10px",
                  backgroundColor: {
                    xs: "transparent",
                    md: COLORS.whiteSmoke,
                  },
                }}
              >
                {chainId && (
                  <NetworkIcon
                    chainId={chainId as SupportedChainId}
                    width={isMobile ? 14 : 11}
                    height={isMobile ? 14 : 11}
                  />
                )}
                <Typography
                  sx={{
                    color: COLORS.blackRock,
                    fontSize: { xs: "15px", md: "10px" },
                    lineHeight: { xs: "20px", md: "14px" },
                  }}
                >
                  {asset}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <TrendingMarketDetails
          marketName={marketName}
          borrower={borrowerName}
          asset={asset}
          chainId={chainId}
          suppliedPct={suppliedPct}
          supplied={supplied}
          capacity={capacity}
          status={status}
          termLabel={termLabel}
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
