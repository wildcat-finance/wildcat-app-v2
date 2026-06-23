"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { buildMarketHref, formatBps } from "@/utils/formatters"

import {
  BorrowerAssetRowStyle,
  BorrowerLinkStyle,
  CardBadgeStyle,
  CardBodyStyle,
  CardContainerStyle,
  CardFooterStyle,
  CardHeaderStyle,
  CardIconStyle,
  CardValueStyle,
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
  { label: string; color: string; Icon: typeof TrendingIcon }
> = {
  trending: { label: "Trending", color: COLORS.blueRibbon, Icon: TrendingIcon },
  popular: { label: "Popular", color: "#28CA7C", Icon: PopularIcon },
  trackRecord: { label: "Track Record", color: "#B9A0FF", Icon: ProvenIcon },
  hotRate: { label: "Hot Rate", color: "#F5651C", Icon: HotRateIcon },
  topFunded: { label: "Top Funded", color: "#7547F5", Icon: TopFundedIcon },
}

const CtaLabelSx = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 500,
  color: COLORS.white,
  whiteSpace: "nowrap",
}

type TrendingMarketCardProps = {
  variant: TrendingMarketCardVariant
  title: string
  value: string
  period?: string
  marketAddress: string
  chainId?: number
  borrowerName: string
  borrowerAddress: string
  asset: string
  apr: number
}

export const TrendingMarketCard = ({
  variant,
  title,
  value,
  period,
  marketAddress,
  chainId,
  borrowerName,
  borrowerAddress,
  asset,
  apr,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]

  return (
    <Box sx={CardContainerStyle}>
      <Box sx={CardHeaderStyle}>
        <Box sx={{ ...CardBadgeStyle, backgroundColor: badge.color }}>
          <Typography
            variant="text4"
            sx={{
              color: COLORS.white,
              whiteSpace: "nowrap",
            }}
          >
            {badge.label}
          </Typography>
        </Box>

        <SvgIcon component={badge.Icon} inheritViewBox sx={CardIconStyle} />
      </Box>

      <Box sx={CardBodyStyle}>
        <Box sx={CardValueStyle}>
          <Typography
            sx={{
              fontSize: pxToRem(13),
              lineHeight: lh(20, 13),
              fontWeight: 500,
              color: COLORS.blackRock,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: pxToRem(16),
              lineHeight: lh(24, 16),
              fontWeight: 700,
              color: COLORS.blackRock,
            }}
          >
            {value}
          </Typography>
        </Box>

        <Typography
          sx={{
            color: COLORS.matteSilver,
            whiteSpace: "nowrap",
          }}
          variant="text4"
        >
          {period ?? "\u00A0"}
        </Typography>
      </Box>

      <Box sx={CardFooterStyle}>
        <Box sx={BorrowerAssetRowStyle}>
          <Box
            component={Link}
            href={`${ROUTES.lender.profile}/${borrowerAddress}`}
            sx={BorrowerLinkStyle}
          >
            <BorrowerProfileChip borrower={borrowerName} />
          </Box>

          <Typography variant="text3">{asset}</Typography>
        </Box>

        <Box
          component={Link}
          href={buildMarketHref(marketAddress, chainId)}
          sx={MarketContainerStyle}
        >
          <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
            <Typography variant="text4" color={COLORS.white}>
              Earn
            </Typography>
            <Typography variant="text4" color={COLORS.white}>
              {formatBps(apr)}% APR
            </Typography>
          </Box>

          <Typography variant="mobText3SemiBold" color={COLORS.white}>
            Deposit
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
