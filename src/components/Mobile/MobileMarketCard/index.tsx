import * as React from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import {
  HooksKind,
  SupportedChainId,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
import { getAdsConfig } from "@/components/AdsBanners/adsConfig"
import { getAdsTooltipComponent } from "@/components/AdsBanners/adsHelpers"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MobileComposableBlock } from "@/components/Destinations"
import { NetworkIcon } from "@/components/NetworkIcon"
import type { Destination } from "@/lib/destinations/types"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
  formatCompactNumber,
  formatSecsToHours,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderMobileMarketItem = {
  id: string
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
  capacity?: TokenAmount
  capacityLeft?: TokenAmount
}

const formatCompactToken = (amount: TokenAmount | undefined) =>
  amount ? formatCompactNumber(parseFloat(amount.format(amount.decimals))) : "0"

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
      variant="mobText4"
      sx={{
        position: "relative",
        // Claim the row's leftover space so the fit check compares the full
        // label against the available width, not the rendered text's width
        flexGrow: 1,
        minWidth: 0,
        overflow: "hidden",
        color: COLORS.blackRock08,
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
      flexShrink: 0,
      gap: "2px",
      padding: "1px 6px 1px 4px",
      borderRadius: "20px",
      backgroundColor: COLORS.blackHaze,
    }}
  >
    <NetworkIcon chainId={chainId as SupportedChainId} width={10} height={10} />
    <Typography
      variant="mobText4"
      sx={{ color: COLORS.blackRock, lineHeight: "14px", whiteSpace: "nowrap" }}
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
      gap: label ? "4px" : 0,
      padding: label ? "0 6px 0 2px" : "1px",
      borderRadius: "20px",
      backgroundColor: COLORS.whiteSmoke,
    }}
  >
    <SvgIcon sx={{ width: "14px", height: "14px" }}>
      <Icon />
    </SvgIcon>
    {label && (
      <Typography
        variant="mobText4"
        sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
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
      variant="mobText4"
      sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
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
          gap: "4px",
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
            gap: "4px",
          }}
        >
          {multiplierText}
          <PointsPill Icon={ProposalIcon} label={config.proposalChipLabel} />
        </Box>
      </Box>
    </Tooltip>
  )
}

export const MobileMarketCard = ({
  marketItem,
  showBorrower = true,
  baseRoute = ROUTES.lender.market,
  destinations,
}: {
  marketItem: LenderMobileMarketItem
  showBorrower?: boolean
  baseRoute?: string
  destinations?: Destination[]
}) => {
  const deposited = marketItem.deposited ?? marketItem.debt
  const capacity =
    marketItem.capacity ??
    (deposited && marketItem.capacityLeft
      ? deposited.add(marketItem.capacityLeft)
      : undefined)
  const depositedRaw = deposited?.raw.toBigInt() ?? BigInt(0)
  const capacityRaw = capacity?.raw.toBigInt() ?? BigInt(0)
  const depositedPct =
    capacityRaw > BigInt(0)
      ? Math.min(
          100,
          Number((depositedRaw * BigInt(10000)) / capacityRaw) / 100,
        )
      : 0

  const isOpenTerm = marketItem.term.kind === HooksKind.OpenTerm
  const termLabel = isOpenTerm
    ? "Open Term"
    : `Fixed Term: ${formatFixedTermDate(marketItem.term.fixedPeriod ?? 0)}`
  const href = buildMarketHref(marketItem.id, marketItem.chainId, baseRoute)

  const isHealthy = marketItem.status.status === MarketStatus.HEALTHY
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "12px 8px",
      }}
    >
      <Box
        component={Link}
        href={href}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          color: "inherit",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <Box
          sx={{
            minHeight: "16px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <MarketStatusAndTermChip
            status={marketItem.status}
            termLabel={termLabel}
            size="small"
          />
          <WithdrawalCycleText seconds={marketItem.withdrawalBatchDuration} />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "2px 0",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <Typography
              variant="mobText2"
              sx={{
                minWidth: 0,
                overflow: "hidden",
                color: COLORS.blackRock,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {marketItem.name}
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "baseline", flexShrink: 0 }}
            >
              <Typography
                variant="mobText2SemiBold"
                sx={{ color: COLORS.blackRock }}
              >
                {formatBps(marketItem.apr)}%
              </Typography>
              <Typography
                variant="mobText4"
                sx={{ color: COLORS.matteSilver, marginLeft: "4px" }}
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
              gap: "4px",
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "2px",
              }}
            >
              {showBorrower && (
                <BorrowerProfileChip
                  borrower={marketItem.borrower ?? marketItem.borrowerAddress}
                  size="tiny"
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
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "10px 2px 0",
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "3px",
              overflow: "hidden",
              borderRadius: "1.5px",
              backgroundColor: COLORS.whiteLilac,
            }}
          >
            <Box
              sx={{
                width: `${depositedPct}%`,
                height: "100%",
                borderRadius: "inherit",
                backgroundColor: isHealthy
                  ? COLORS.blueRibbon
                  : COLORS.greySuit,
                opacity: isHealthy ? 0.8 : 1,
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
              variant="mobText4"
              sx={{
                color: COLORS.blackRock,
                fontSize: "11px",
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              {formatCompactToken(deposited)} {marketItem.asset}{" "}
              <Box component="span" sx={{ color: COLORS.manate }}>
                deposited
              </Box>
            </Typography>
            <Typography
              variant="mobText4"
              sx={{
                minWidth: 0,
                overflow: "hidden",
                color: COLORS.manate,
                fontSize: "11px",
                lineHeight: "16px",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              out of {formatCompactToken(capacity)} {marketItem.asset}
            </Typography>
          </Box>
        </Box>
      </Box>
      {destinations && destinations.length > 0 && (
        <MobileComposableBlock
          destinations={destinations}
          marketAddress={marketItem.id}
          marginTop="8px"
        />
      )}
    </Box>
  )
}
