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
    desktopAccent: string
    iconColor: string
    desktopIconColor: string
    labelColor: string
    Icon: typeof TrendingIcon
  }
> = {
  fastestGrowing: {
    label: "Fastest Growing",
    context: "Last 7 days",
    accent: "#CBD7FF",
    desktopAccent: "#6687FF",
    iconColor: "#B6C8FF",
    desktopIconColor: "#B6C8FF",
    labelColor: "#4971FF",
    Icon: TrendingIcon,
  },
  popular: {
    label: "Popular",
    context: "Last 7 days",
    accent: "#BEEFD7",
    desktopAccent: "#28CA7C",
    iconColor: "#2ACA7C",
    desktopIconColor: "#28CA7C",
    labelColor: "#1A955A",
    Icon: PopularIcon,
  },
  newest: {
    label: "Newest Market",
    context: "",
    accent: "#D7C9FD",
    desktopAccent: "#7547F5",
    iconColor: "#7547F5",
    desktopIconColor: "#B9A0FF",
    labelColor: "#7547F5",
    Icon: ProvenIcon,
  },
  hotRate: {
    label: "Peak APR",
    context: "",
    accent: "#FDCEB6",
    desktopAccent: "#F5651C",
    iconColor: "#F5651D",
    desktopIconColor: "#F5651C",
    labelColor: "#D2622A",
    Icon: HotRateIcon,
  },
  topFunded: {
    label: "Top Funded",
    context: "",
    accent: "#BFE7FD",
    desktopAccent: "#48B5F4",
    iconColor: "#48B5F4",
    desktopIconColor: "#48B5F4",
    labelColor: "#238CC8",
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
          borderColor: { xs: COLORS.whiteLilac, md: COLORS.blueRibbon },
        }),
        borderTop: {
          xs: `3px solid ${badge.accent}`,
          md: `1px solid ${badge.desktopAccent}`,
        },
      }}
    >
      <Box sx={CardHeaderStyle}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: "10px", md: "4px" },
          }}
        >
          <SvgIcon
            component={badge.Icon}
            sx={{
              ...CardIconStyle,
              '& [fill="#30313E"]': {
                fill: { xs: badge.iconColor, md: badge.desktopIconColor },
              },
            }}
          />
          <Typography
            variant="text4Highlighted"
            sx={{
              color: { xs: COLORS.black, md: badge.labelColor },
              fontSize: { xs: "14px", md: pxToRem(11) },
              lineHeight: { xs: "20px", md: lh(16, 11) },
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
              fontSize: { xs: "14px", md: pxToRem(11) },
              lineHeight: { xs: "20px", md: lh(16, 11) },
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
            gap: { xs: "5px", md: 0 },
            height: { md: "60px" },
            padding: { xs: "0 0 12px", md: "8px 6px 0" },
            borderBottom: { xs: `1px solid ${COLORS.whiteLilac}`, md: "none" },
          }}
        >
          <Typography
            variant="text4"
            sx={{
              color: COLORS.blackRock,
              fontSize: { xs: "14px", md: "13px" },
              lineHeight: { xs: "20px", md: "20px" },
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
                gap: { xs: "6px", md: "4px" },
                ...(variant === "fastestGrowing" && { cursor: "help" }),
              }}
            >
              <Typography
                variant="mobH2"
                sx={{
                  color: { xs: COLORS.black, md: COLORS.blackRock },
                  fontSize: { xs: "24px", md: "20px" },
                  fontWeight: { md: 600 },
                  lineHeight: { xs: 1, md: "32px" },
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
                      md: "0 6px 0 4px",
                    },
                    borderRadius: { xs: "12px", md: "20px" },
                    backgroundColor: {
                      xs: COLORS.whiteSmoke,
                      md: COLORS.blackHaze,
                    },
                  }}
                >
                  {chainId && (
                    <NetworkIcon
                      chainId={chainId as SupportedChainId}
                      width={isMobile ? 12 : 10}
                      height={isMobile ? 12 : 10}
                    />
                  )}
                  <Typography
                    variant="mobText3"
                    sx={{
                      color: COLORS.blackRock,
                      fontSize: { xs: "13px", md: "13px" },
                      lineHeight: { xs: "18px", md: "20px" },
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
                    padding: { xs: "2px 8px", md: "0 6px" },
                    borderRadius: "20px",
                    backgroundColor: COLORS.lightGreen,
                    color: "#2ACA7C",
                    fontSize: { xs: "12px", md: "11px" },
                    lineHeight: { xs: "18px", md: "20px" },
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
                fontSize: { xs: "15px", md: "13px" },
                lineHeight: { xs: "20px", md: "20px" },
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
            expanded={composableExpanded}
            onToggle={() => onToggleComposable?.()}
            controls={composableControls}
          />
        )}
      </Box>
    </Box>
  )
}
