"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref, formatBps } from "@/utils/formatters"

export type TrendingMarketCardVariant =
  | "trending"
  | "popular"
  | "proven"
  | "hotRate"
  | "topFunded"

const VARIANT_BADGE: Record<
  TrendingMarketCardVariant,
  { label: string; color: string; Icon: typeof TrendingIcon }
> = {
  trending: { label: "Trending", color: "#4971FF", Icon: TrendingIcon },
  popular: { label: "Popular", color: "#28CA7C", Icon: PopularIcon },
  proven: { label: "Proven", color: "#B9A0FF", Icon: ProvenIcon },
  hotRate: { label: "Hot Rate", color: "#F5651C", Icon: HotRateIcon },
  topFunded: { label: "Top Funded", color: "#7547F5", Icon: TopFundedIcon },
}

type TrendingMarketCardProps = {
  variant: TrendingMarketCardVariant
  value: string
  description: string
  marketAddress: string
  chainId?: number
  borrowerName: string
  borrowerAddress: string
  asset: string
  apr: number
}

export const TrendingMarketCard = ({
  variant,
  value,
  description,
  marketAddress,
  chainId,
  borrowerName,
  borrowerAddress,
  asset,
  apr,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        borderRadius: "12px",
        border: `1px solid ${COLORS.iron}`,
        backgroundColor: COLORS.white,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "flex-start",
            minWidth: 0,
          }}
        >
          <SvgIcon
            component={badge.Icon}
            inheritViewBox
            sx={{ width: "28px", height: "28px", flexShrink: 0 }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              paddingBottom: "8px",
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                color: COLORS.blackRock,
                fontSize: "24px",
                lineHeight: "32px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="text3"
              sx={{
                color: COLORS.blackRock,
                opacity: 0.7,
                whiteSpace: "nowrap",
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
            borderRadius: "12px",
            backgroundColor: badge.color,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="text3"
            sx={{ color: COLORS.white, whiteSpace: "nowrap" }}
          >
            {badge.label}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <Box
          component={Link}
          href={`${ROUTES.lender.profile}/${borrowerAddress}`}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "10px",
            backgroundColor: COLORS.whiteSmoke,
            textDecoration: "none",
          }}
        >
          <Typography
            variant="text3"
            sx={{
              color: COLORS.blackRock,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {borrowerName}
          </Typography>
          <Typography
            variant="text3"
            sx={{
              color: COLORS.blackRock,
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
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            backgroundColor: COLORS.bunker,
            textDecoration: "none",
          }}
        >
          <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
            <Typography
              variant="text3"
              sx={{ color: COLORS.white, whiteSpace: "nowrap" }}
            >
              Earn
            </Typography>
            <Typography
              variant="text3"
              sx={{ color: COLORS.white, whiteSpace: "nowrap" }}
            >
              {formatBps(apr)}% APY
            </Typography>
          </Box>
          <Typography
            variant="text3"
            sx={{
              color: COLORS.white,
              fontWeight: 600,
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
