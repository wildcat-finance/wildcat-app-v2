"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { buildMarketHref, formatBps } from "@/utils/formatters"

import {
  BorrowersContainerStyle,
  CardBadgeStyle,
  CardContainerStyle,
  CardIconStyle,
  CardInfoContainerStyle,
  CardValueContainerStyle,
  CardValueStyle,
  LinksContainerStyle,
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
  trending: { label: "Trending", color: "#4971FF", Icon: TrendingIcon },
  popular: { label: "Popular", color: "#28CA7C", Icon: PopularIcon },
  trackRecord: { label: "Track Record", color: "#B9A0FF", Icon: ProvenIcon },
  hotRate: { label: "Hot Rate", color: "#F5651C", Icon: HotRateIcon },
  topFunded: { label: "Top Funded", color: "#7547F5", Icon: TopFundedIcon },
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
  const isMobile = useMobileResolution()
  const badge = VARIANT_BADGE[variant]

  return (
    <Box sx={CardContainerStyle}>
      <Box sx={CardInfoContainerStyle}>
        <Box sx={CardValueContainerStyle}>
          <SvgIcon component={badge.Icon} inheritViewBox sx={CardIconStyle} />

          <Box sx={CardValueStyle}>
            <Typography
              sx={{
                fontSize: pxToRem(16),
                lineHeight: lh(26, 16),
                fontWeight: 500,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant={isMobile ? "mobH2" : "title2"}
              fontWeight={600}
            >
              {value}
            </Typography>
            <Typography
              variant={isMobile ? "mobText4" : "text4"}
              sx={{
                opacity: 0.7,
                whiteSpace: "nowrap",
              }}
            >
              {period ?? " "}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ ...CardBadgeStyle, backgroundColor: badge.color }}>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.white}
            sx={{ whiteSpace: "nowrap" }}
          >
            {badge.label}
          </Typography>
        </Box>
      </Box>

      <Box sx={LinksContainerStyle}>
        <Box
          component={Link}
          href={`${ROUTES.lender.profile}/${borrowerAddress}`}
          sx={BorrowersContainerStyle}
        >
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            fontWeight={600}
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {borrowerName}
          </Typography>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            sx={{
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {asset}
          </Typography>
        </Box>

        <Box
          component={Link}
          href={buildMarketHref(marketAddress, chainId)}
          sx={MarketContainerStyle}
        >
          <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.white}
              sx={{ whiteSpace: "nowrap" }}
            >
              Earn
            </Typography>
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.white}
              sx={{ whiteSpace: "nowrap" }}
            >
              {formatBps(apr)}% APR
            </Typography>
          </Box>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            fontWeight={600}
            color={COLORS.white}
            sx={{
              whiteSpace: "nowrap",
            }}
          >
            Deposit
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
