"use client"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { TrendingMarketDetails } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel/TrendingMarketsCard/BorrowerBlock"
import HotRateIcon from "@/assets/icons/hotRateCard_icon.svg"
import PopularIcon from "@/assets/icons/popularCard_icon.svg"
import ProvenIcon from "@/assets/icons/provenCard_icon.svg"
import TopFundedIcon from "@/assets/icons/topFundedCard_icon.svg"
import TrendingIcon from "@/assets/icons/trendingCard_icon.svg"
import { NetworkIcon } from "@/components/NetworkIcon"
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
  | "fastestGrowing"
  | "popular"
  | "newest"
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
  fastestGrowing: {
    label: "Fastest Growing",
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
  newest: {
    label: "Newest Market",
    context: "",
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
  /** Small colored companion stat rendered beside the value (e.g. growth rate) */
  secondaryValue?: string
  context?: string
  marketName: string
  marketAddress: string
  chainId?: number
  borrowerName: string
  borrowerAddress: string
  asset: string
  apr: number
  supplied: string
  capacity: string
  suppliedPct: number
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
  isMobile: boolean
}

export const TrendingMarketCard = ({
  variant,
  value,
  secondaryValue,
  context,
  marketName,
  marketAddress,
  chainId,
  borrowerName,
  borrowerAddress,
  asset,
  apr,
  supplied,
  capacity,
  suppliedPct,
  status,
  termLabel,
  isMobile,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]
  const badgeContext = context ?? badge.context
  const growthTooltip = `Net new capital in the ${badgeContext.toLowerCase()}. The % shows growth compared to the start of that period`

  const statisticTitle = {
    fastestGrowing: "Fresh Capital",
    popular: "Lenders Joined",
    newest: "Launched",
    hotRate: "Best Market APR",
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
            variant="text4Highlighted"
            sx={{
              color: { xs: COLORS.black, md: badge.labelColor },
              fontSize: { xs: "14px", md: pxToRem(11) },
              lineHeight: { xs: "20px", md: lh(14, 11) },
              whiteSpace: "nowrap",
            }}
          >
            {badge.label}
          </Typography>
        </Box>

        {badgeContext && (
          <Typography
            variant="text4"
            sx={{
              color: COLORS.matteSilver,
              fontSize: { xs: "14px", md: pxToRem(10) },
              lineHeight: { xs: "20px", md: lh(14, 10) },
              whiteSpace: "nowrap",
            }}
          >
            {badgeContext}
          </Typography>
        )}
      </Box>

      <Box sx={CardContentStyle}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: "5px", md: "3px" },
            paddingBottom: { xs: "12px", md: "11px" },
            borderBottom: `1px solid ${COLORS.whiteLilac}`,
          }}
        >
          <Typography
            variant="text4"
            sx={{
              color: COLORS.blackRock,
              fontSize: { xs: "14px", md: "11px" },
              lineHeight: { xs: "20px", md: "14px" },
            }}
          >
            {statisticTitle}
          </Typography>
          <Tooltip
            title={variant === "fastestGrowing" ? growthTooltip : ""}
            placement="bottom-start"
            enterTouchDelay={0}
            leaveTouchDelay={4000}
          >
            <Box
              sx={{
                width: "fit-content",
                display: "flex",
                alignItems: "center",
                gap: { xs: "6px", md: "5px" },
                ...(variant === "fastestGrowing" && { cursor: "help" }),
              }}
            >
              <Typography
                variant="mobH2"
                sx={{
                  color: COLORS.black,
                  fontSize: { xs: "24px", md: "20px" },
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </Typography>
              {(variant === "topFunded" || variant === "fastestGrowing") && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: {
                      xs: "2px 8px 2px 6px",
                      md: "2px 7px 2px 5px",
                    },
                    borderRadius: { xs: "12px", md: "10px" },
                    backgroundColor: COLORS.whiteSmoke,
                  }}
                >
                  {chainId && (
                    <NetworkIcon
                      chainId={chainId as SupportedChainId}
                      width={isMobile ? 12 : 11}
                      height={isMobile ? 12 : 11}
                    />
                  )}
                  <Typography
                    variant="mobText3"
                    sx={{
                      color: COLORS.blackRock,
                      fontSize: { xs: "13px", md: "10px" },
                      lineHeight: { xs: "18px", md: "14px" },
                    }}
                  >
                    {asset}
                  </Typography>
                </Box>
              )}
              {secondaryValue && (
                <Typography
                  variant="mobText3SemiBold"
                  sx={{
                    padding: { xs: "2px 8px", md: "2px 6px" },
                    borderRadius: "20px",
                    backgroundColor: COLORS.lightGreen,
                    color: "#2ACA7C",
                    fontSize: { xs: "12px", md: "10px" },
                    lineHeight: { xs: "18px", md: "14px" },
                    whiteSpace: "nowrap",
                  }}
                >
                  ↑{secondaryValue}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Box>

        <TrendingMarketDetails
          marketName={marketName}
          borrower={borrowerName}
          borrowerAddress={borrowerAddress}
          asset={asset}
          chainId={chainId}
          suppliedPct={suppliedPct}
          supplied={supplied}
          capacity={capacity}
          status={status}
          termLabel={termLabel}
          isMobile={isMobile}
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
              variant="text4"
              sx={{
                color: COLORS.white,
                fontSize: { xs: "15px", md: "11px" },
                lineHeight: { xs: "20px", md: "16px" },
                whiteSpace: "nowrap",
              }}
            >
              Earn {formatBps(apr)}% APR
            </Typography>
            <Typography
              variant="text4Highlighted"
              sx={{
                color: COLORS.white,
                fontSize: { xs: "15px", md: "11px" },
                lineHeight: { xs: "20px", md: "16px" },
                whiteSpace: "nowrap",
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
