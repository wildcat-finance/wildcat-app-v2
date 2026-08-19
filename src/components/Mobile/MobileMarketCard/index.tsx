import * as React from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import {
  DepositStatus,
  HooksKind,
  MarketOnboardingMode,
  SupportedChainId,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
import { getAdsConfig } from "@/components/AdsBanners/adsConfig"
import { getAdsTooltipComponent } from "@/components/AdsBanners/adsHelpers"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { NetworkIcon } from "@/components/NetworkIcon"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
} from "@/utils/formatters"
import { MarketImplementationType } from "@/utils/marketImplementation"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type MobileMarketItem = {
  id: string
  implementationType: MarketImplementationType
  chainId: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower?: string
  borrowerAddress?: string
  asset: string
  apr: number
  withdrawalBatchDuration: number
  debt?: TokenAmount
  deposited?: TokenAmount
  loan?: TokenAmount
  capacity?: TokenAmount
  capacityLeft?: TokenAmount
  onboardingMode?: MarketOnboardingMode
  depositStatus?: DepositStatus
  utilisation?: number
}

export type MobileMarketCardVariant = "lender-action" | "borrower-context"

export type MobileMarketCardProps = {
  marketItem: MobileMarketItem
  showBorrower?: boolean
  baseRoute?: string
  displayName?: string
}

const compactFormat = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)

const formatCompactToken = (amount: TokenAmount | undefined) =>
  amount ? compactFormat(parseFloat(amount.format(amount.decimals))) : "0"

const formatFixedTermDate = (millisecondsFromNow: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(Date.now() + millisecondsFromNow)

const formatSecsToHoursCompact = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86400)
  if (days >= 2) return `${days}d`
  const hours = Math.floor(s / 3600)
  if (hours > 0) return `${hours}h`
  const minutes = Math.floor((s % 3600) / 60)
  if (minutes > 0) return `${minutes}m`
  return "<1m"
}

// "24 hours withdrawal" doesn't always fit next to a fixed-term chip on
// narrow screens. Rather than ellipsizing mid-word, swap to a compact
// "24h WD" once the full label is measured not to fit. A hidden replica of
// the full label keeps the measurement stable in both directions.
const WithdrawalCycleText = ({ seconds }: { seconds: number }) => {
  const textRef = React.useRef<HTMLElement>(null)
  const measureRef = React.useRef<HTMLElement>(null)
  const [compact, setCompact] = React.useState(false)

  const fullLabel = `• ${formatSecsToHours(seconds, true)} withdrawal`
  // No bullet in the compact form: at the widths that force it, even those
  // few pixels matter
  const compactLabel = `${formatSecsToHoursCompact(seconds)} WD`

  React.useLayoutEffect(() => {
    const text = textRef.current
    const measure = measureRef.current
    if (!text || !measure) return undefined
    const check = () => setCompact(measure.offsetWidth > text.clientWidth)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(text)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [fullLabel])

  return (
    <Typography
      ref={textRef}
      variant="mobText2"
      sx={{
        position: "relative",
        // Claim the row's leftover space so the fit check compares the full
        // label against the available width, not the rendered text's width
        flexGrow: 1,
        minWidth: 0,
        overflow: "hidden",
        color: COLORS.blackRock,
        fontSize: "14px",
        lineHeight: "20px",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {compact ? compactLabel : fullLabel}
      <Box
        ref={measureRef}
        component="span"
        aria-hidden
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {fullLabel}
      </Box>
    </Typography>
  )
}

const MarketAssetChip = ({
  asset,
  chainId,
}: {
  asset: string
  chainId: number
}) => (
  <Box
    sx={{
      width: "fit-content",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 9px 2px 7px",
      borderRadius: "12px",
      backgroundColor: COLORS.whiteSmoke,
    }}
  >
    <NetworkIcon chainId={chainId as SupportedChainId} width={14} height={14} />
    <Typography
      variant="mobText3"
      sx={{ fontSize: "13px", lineHeight: "18px" }}
    >
      {asset}
    </Typography>
  </Box>
)

const PointsPill = ({
  Icon,
  label,
}: {
  Icon: React.ElementType
  label?: string
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      gap: label ? "6px" : 0,
      padding: label ? "2px 10px 2px 2px" : "2px",
      borderRadius: "12px",
      backgroundColor: COLORS.bunker,
    }}
  >
    <SvgIcon sx={{ width: "18px", height: "18px" }}>
      <Icon />
    </SvgIcon>
    {label && (
      <Typography
        variant="mobText3"
        sx={{
          color: COLORS.white,
          fontSize: "13px",
          lineHeight: "18px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    )}
  </Box>
)

const MarketPointsChip = ({
  chainId,
  marketAddress,
  apr,
}: {
  chainId: number
  marketAddress: string
  apr: number
}) => {
  const containerRef = React.useRef<HTMLElement>(null)
  const measureRef = React.useRef<HTMLElement>(null)
  // The labelled pill wraps into a two-line blob when the row runs out of
  // room. Once the full chip is measured not to fit, drop the label and keep
  // the multiplier + icon; the tooltip still carries the full program info.
  const [iconOnly, setIconOnly] = React.useState(false)

  const config = getAdsConfig(chainId, marketAddress)

  React.useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return undefined
    const check = () => setIconOnly(measure.offsetWidth > container.clientWidth)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(container)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [chainId, marketAddress])

  if (!config) return null

  const multiplier = config.proposalText.match(/[\d.]+x/i)?.[0]
  const tooltip = getAdsTooltipComponent(chainId, marketAddress, formatBps(apr))
  const { ProposalIcon } = config

  const multiplierText = multiplier && (
    <Typography
      variant="mobText3"
      sx={{ fontSize: "13px", lineHeight: "18px", whiteSpace: "nowrap" }}
    >
      +{multiplier}
    </Typography>
  )

  return (
    <Tooltip
      placement="bottom-end"
      arrow={false}
      title={tooltip}
      componentsProps={{
        tooltip: {
          sx: {
            p: 0,
            bgcolor: "transparent",
            boxShadow: "none",
            borderRadius: 0,
            maxWidth: "none",
          },
        },
      }}
    >
      <Box
        ref={containerRef}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        sx={{
          position: "relative",
          // Claim the row's leftover space so the fit check compares the full
          // chip against what the row can actually offer it
          flexGrow: 1,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "5px",
          cursor: "help",
        }}
      >
        {multiplierText}
        <PointsPill
          Icon={ProposalIcon}
          label={iconOnly ? undefined : config.proposalChipLabel}
        />
        <Box
          ref={measureRef}
          aria-hidden
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            visibility: "hidden",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          {multiplierText}
          <PointsPill Icon={ProposalIcon} label={config.proposalChipLabel} />
        </Box>
      </Box>
    </Tooltip>
  )
}

export const getMobileMarketTermLabel = (marketItem: MobileMarketItem) => {
  if (marketItem.term.kind === HooksKind.PeriodicTerm) return "Periodic Term"
  if (marketItem.term.kind === HooksKind.FixedTerm) {
    return `Fixed Term: ${formatFixedTermDate(
      marketItem.term.fixedPeriod ?? 0,
    )}`
  }
  return "Open Term"
}

export const MobileMarketCard = ({
  marketItem,
  showBorrower = true,
  baseRoute = ROUTES.lender.market,
  displayName,
}: MobileMarketCardProps) => {
  const deposited = marketItem.deposited ?? marketItem.debt
  const capacity =
    marketItem.capacity ??
    (deposited && marketItem.capacityLeft
      ? deposited.add(marketItem.capacityLeft)
      : undefined)
  const depositedRaw = deposited?.raw ?? BigInt(0)
  const capacityRaw = capacity?.raw ?? BigInt(0)
  const depositedPct =
    capacityRaw > BigInt(0)
      ? Math.min(
          100,
          Number((depositedRaw * BigInt(10000)) / capacityRaw) / 100,
        )
      : 0

  const termLabel = getMobileMarketTermLabel(marketItem)
  const href = buildMarketHref(marketItem.id, marketItem.chainId, baseRoute)

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "16px",
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "14px",
        backgroundColor: COLORS.white,
        color: "inherit",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MarketStatusAndTermChip
          status={marketItem.status}
          termLabel={termLabel}
        />
        <WithdrawalCycleText seconds={marketItem.withdrawalBatchDuration} />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Typography
          variant="mobText1"
          sx={{
            minWidth: 0,
            overflow: "hidden",
            color: COLORS.blackRock,
            fontSize: "16px",
            lineHeight: "22px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName ?? marketItem.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", flexShrink: 0 }}>
          <Typography
            variant="mobH2SemiBold"
            sx={{ fontSize: "20px", lineHeight: "26px" }}
          >
            {formatBps(marketItem.apr)}%
          </Typography>
          <Typography
            variant="mobText3"
            sx={{
              color: COLORS.matteSilver,
              fontSize: "12px",
              lineHeight: "16px",
              marginLeft: "4px",
            }}
          >
            APR
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {showBorrower && (
            <BorrowerProfileChip
              borrower={marketItem.borrower ?? marketItem.borrowerAddress}
              size="medium"
              href={
                marketItem.borrowerAddress
                  ? `${ROUTES.lender.profile}/${marketItem.borrowerAddress}`
                  : undefined
              }
            />
          )}
          <MarketAssetChip
            asset={marketItem.asset}
            chainId={marketItem.chainId}
          />
        </Box>

        <MarketPointsChip
          chainId={marketItem.chainId}
          marketAddress={marketItem.id}
          apr={marketItem.apr}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          height: "6px",
          overflow: "hidden",
          marginTop: "14px",
          borderRadius: "3px",
          backgroundColor: COLORS.athensGrey,
        }}
      >
        <Box
          sx={{
            width: `${depositedPct}%`,
            height: "100%",
            borderRadius: "inherit",
            backgroundColor:
              marketItem.status.status === MarketStatus.HEALTHY
                ? COLORS.blueRibbon
                : COLORS.greySuit,
          }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Typography
          variant="mobText1"
          sx={{
            color: COLORS.blackRock,
            fontSize: "16px",
            lineHeight: "22px",
            whiteSpace: "nowrap",
          }}
        >
          {formatCompactToken(deposited)} {marketItem.asset}{" "}
          <Box component="span" sx={{ color: COLORS.matteSilver }}>
            deposited
          </Box>
        </Typography>
        <Typography
          variant="mobText1"
          sx={{
            overflow: "hidden",
            color: COLORS.matteSilver,
            fontSize: "16px",
            lineHeight: "22px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          out of {formatCompactToken(capacity)} {marketItem.asset}
        </Typography>
      </Box>
    </Box>
  )
}
