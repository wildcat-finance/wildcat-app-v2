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
  BorrowerLinkStyle,
  CardBodyStyle,
  CardContainerStyle,
  CardContentStyle,
  CardFooterStyle,
  CardHeaderStyle,
  CardIconStyle,
  CardValueStyle,
  MarketContainerStyle,
  MarketInfoBoxStyle,
  SupplyProgressFillStyle,
  SupplyProgressTrackStyle,
} from "./style"

export type TrendingMarketCardVariant =
  | "trending"
  | "popular"
  | "trackRecord"
  | "hotRate"
  | "topFunded"

// accent = badge text color, iconColor = tint for the icon's dark shapes,
// band = tinted header strip background. Sampled from target.png after
// converting its embedded monitor ICC profile to sRGB.
const VARIANT_BADGE: Record<
  TrendingMarketCardVariant,
  {
    label: string
    accent: string
    iconColor: string
    band: string
    Icon: typeof TrendingIcon
  }
> = {
  trending: {
    label: "Trending",
    accent: COLORS.blueRibbon,
    // pale tone for the six dark squares; the asset's native #6687FF
    // top-right square is untouched by the recolor, keeping the two-tone look
    iconColor: "#B6C8FF",
    band: "#ECF0FF",
    Icon: TrendingIcon,
  },
  popular: {
    label: "Popular",
    accent: "#19955A",
    iconColor: "#2ACA7C",
    band: "#E3F8EE",
    Icon: PopularIcon,
  },
  trackRecord: {
    label: "Track Record",
    accent: "#7547F5",
    iconColor: "#B9A0FF",
    band: "#EFEAFF",
    Icon: ProvenIcon,
  },
  hotRate: {
    label: "Hot Rate",
    accent: "#D36229",
    iconColor: "#F5651D",
    band: "#FFE8DC",
    Icon: HotRateIcon,
  },
  topFunded: {
    label: "Top Funded",
    accent: "#238BC8",
    iconColor: "#48B5F4",
    band: "#DDF3FF",
    Icon: TopFundedIcon,
  },
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
  supplied: string
  capacity: string
  suppliedPct: number
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
  supplied,
  capacity,
  suppliedPct,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]

  return (
    <Box sx={CardContainerStyle}>
      <Box sx={{ ...CardHeaderStyle, backgroundColor: badge.band }}>
        <Typography
          sx={{
            fontSize: pxToRem(13),
            lineHeight: lh(20, 13),
            fontWeight: 600,
            color: badge.accent,
            whiteSpace: "nowrap",
          }}
        >
          {badge.label}
        </Typography>

        <SvgIcon
          component={badge.Icon}
          inheritViewBox
          sx={{
            ...CardIconStyle,
            // icons draw with rect/path/circle, all dark-filled with #30313E
            '& [fill="#30313E"]': { fill: badge.iconColor },
          }}
        />
      </Box>

      <Box sx={CardContentStyle}>
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
          <Box sx={MarketInfoBoxStyle}>
            <Box
              component={Link}
              href={`${ROUTES.lender.profile}/${borrowerAddress}`}
              sx={BorrowerLinkStyle}
            >
              <BorrowerProfileChip borrower={borrowerName} />
            </Box>

            <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
              {asset} · {formatBps(apr)}% APR
            </Typography>

            <Box sx={SupplyProgressTrackStyle}>
              <Box
                sx={{
                  ...SupplyProgressFillStyle,
                  width: `${Math.min(100, Math.max(0, suppliedPct))}%`,
                }}
              />
            </Box>

            <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
              {supplied} / {capacity} supplied
            </Typography>
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
    </Box>
  )
}
