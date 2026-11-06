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
import { ComposableCardFooter } from "@/components/Destinations"
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
    mobileAccent: string
    iconColor: string
    labelColor: string
    mobileLabelColor?: string
    Icon: typeof TrendingIcon
  }
> = {
  fastestGrowing: {
    label: "Fastest Growing",
    context: "Last 7 days",
    accent: "#CBD7FF",
    mobileAccent: COLORS.cornflowerBlue,
    iconColor: "#B6C8FF",
    labelColor: "#4971FF",
    Icon: TrendingIcon,
  },
  popular: {
    label: "Popular",
    context: "Last 7 days",
    accent: "#BEEFD7",
    mobileAccent: COLORS.caribbeanGreen,
    iconColor: "#2ACA7C",
    labelColor: "#2ACA7C",
    mobileLabelColor: "#1A955A",
    Icon: PopularIcon,
  },
  newest: {
    label: "Newest Market",
    context: "",
    accent: "#D7C9FD",
    mobileAccent: "#7547F5",
    iconColor: "#7547F5",
    labelColor: "#7547F5",
    Icon: ProvenIcon,
  },
  hotRate: {
    label: "Peak APR",
    context: "",
    accent: "#FDCEB6",
    mobileAccent: "#F5651D",
    iconColor: "#F5651D",
    labelColor: "#F5651D",
    Icon: HotRateIcon,
  },
  topFunded: {
    label: "Top Funded",
    context: "",
    accent: "#BFE7FD",
    mobileAccent: "#48B5F4",
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
  composableCount?: number
  composableExpanded?: boolean
  onToggleComposable?: () => void
  showComposableFooter?: boolean
  /** Destinations are still loading: hold the footer's space, show nothing */
  composablePending?: boolean
  composableControls?: string
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
  composableCount = 0,
  composableExpanded = false,
  onToggleComposable,
  showComposableFooter = false,
  composablePending = false,
  composableControls,
}: TrendingMarketCardProps) => {
  const badge = VARIANT_BADGE[variant]
  const badgeContext = context ?? badge.context
  const growthTooltip =
    badgeContext === "Unavailable"
      ? "Recent capital activity is temporarily unavailable"
      : `Net new capital in the ${badgeContext.toLowerCase()}. The % shows growth compared to the start of that period`

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
        ...(composableExpanded && {
          borderColor: { xs: COLORS.cornflowerBlue, md: COLORS.blueRibbon },
        }),
        borderTop: {
          xs: `1px solid ${badge.mobileAccent}`,
          md: `2px solid ${badge.accent}`,
        },
      }}
    >
      <Box sx={CardHeaderStyle}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: "4px", md: "7px" },
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
              color: {
                xs: badge.mobileLabelColor ?? badge.labelColor,
                md: badge.labelColor,
              },
              fontSize: { xs: "11px", md: pxToRem(11) },
              lineHeight: { xs: "16px", md: lh(14, 11) },
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
              color: { xs: COLORS.manate, md: COLORS.matteSilver },
              fontSize: { xs: "11px", md: pxToRem(10) },
              lineHeight: { xs: "16px", md: lh(14, 10) },
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
            gap: { xs: 0, md: "3px" },
            padding: { xs: "8px 6px 0", md: "0 0 11px" },
            borderBottom: {
              xs: "none",
              md: `1px solid ${COLORS.whiteLilac}`,
            },
          }}
        >
          <Typography
            variant="text4"
            sx={{
              color: COLORS.blackRock,
              fontSize: { xs: "13px", md: "11px" },
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
                gap: { xs: "4px", md: "5px" },
                ...(variant === "fastestGrowing" && { cursor: "help" }),
              }}
            >
              <Typography
                variant="mobH2"
                sx={{
                  color: { xs: COLORS.blackRock, md: COLORS.black },
                  fontSize: "20px",
                  fontWeight: { xs: 600, md: 500 },
                  lineHeight: { xs: "32px", md: 1 },
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
                      xs: "0 6px 0 4px",
                      md: "2px 7px 2px 5px",
                    },
                    borderRadius: { xs: "20px", md: "10px" },
                    backgroundColor: {
                      xs: COLORS.blackHaze,
                      md: COLORS.whiteSmoke,
                    },
                  }}
                >
                  {chainId && (
                    <NetworkIcon
                      chainId={chainId as SupportedChainId}
                      width={isMobile ? 10 : 11}
                      height={isMobile ? 10 : 11}
                    />
                  )}
                  <Typography
                    variant="mobText3"
                    sx={{
                      color: COLORS.blackRock,
                      fontSize: { xs: "13px", md: "10px" },
                      lineHeight: { xs: "20px", md: "14px" },
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
                    padding: { xs: "1px 6px", md: "2px 6px" },
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
                fontSize: "11px",
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              Earn {formatBps(apr)}% APR
            </Typography>
            <Typography
              variant="text4Highlighted"
              sx={{
                color: COLORS.white,
                fontSize: { xs: "13px", md: "11px" },
                lineHeight: { xs: "20px", md: "16px" },
                whiteSpace: "nowrap",
              }}
            >
              Deposit
            </Typography>
          </>
        </Box>

        {showComposableFooter && (
          <ComposableCardFooter
            count={composableCount}
            pending={composablePending}
            expanded={composableExpanded}
            onToggle={() => onToggleComposable?.()}
            controls={composableControls}
          />
        )}
      </Box>
    </Box>
  )
}
