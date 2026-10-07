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
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
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
      variant="mobText4"
      sx={{
        position: "relative",
        // Claim the row's leftover space so the fit check compares the full
        // label against the available width, not the rendered text's width
        flexGrow: 1,
        minWidth: 0,
        overflow: "hidden",
        marginLeft: "4px",
        color: COLORS.blackRock,
        opacity: 0.8,
        fontSize: "10px",
        lineHeight: "16px",
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
      flexShrink: 0,
      alignItems: "center",
      gap: "2px",
      padding: "1px 6px 1px 4px",
      borderRadius: "20px",
      backgroundColor: COLORS.blackHaze,
    }}
  >
    <NetworkIcon chainId={chainId as SupportedChainId} width={10} height={10} />
    <Typography
      variant="mobText4"
      sx={{ color: COLORS.blackRock, fontSize: "10px", lineHeight: "14px" }}
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
      height: "16px",
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
        sx={{
          color: COLORS.blackRock,
          fontSize: "10px",
          lineHeight: "16px",
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
      variant="mobText4"
      sx={{
        color: COLORS.blackRock,
        fontSize: "10px",
        lineHeight: "16px",
        whiteSpace: "nowrap",
      }}
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
  showDestinations = false,
  divider = false,
}: {
  marketItem: LenderMobileMarketItem
  showBorrower?: boolean
  baseRoute?: string
  showDestinations?: boolean
  divider?: boolean
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

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "12px 8px",
        backgroundColor: COLORS.white,
        ...(divider && { borderBottom: `1px solid ${COLORS.whiteLilac}` }),
      }}
    >
      <Box
        component={Link}
        href={href}
        data-market-card-link
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
            minWidth: 0,
            height: "16px",
            display: "flex",
            alignItems: "center",
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
            alignItems: "center",
            gap: "4px",
            padding: "2px 0",
          }}
        >
          <Box
            sx={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "2px",
            }}
          >
            <Typography
              sx={{
                maxWidth: "100%",
                overflow: "hidden",
                color: COLORS.blackRock,
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "24px",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {marketItem.name}
            </Typography>
            <Box
              sx={{
                maxWidth: "100%",
                minWidth: 0,
                display: "flex",
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
          </Box>

          <Box
            sx={{
              maxWidth: "60%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flexShrink: 0,
              gap: "4px",
            }}
          >
            <Typography
              sx={{
                color: COLORS.blackRock,
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: "24px",
                whiteSpace: "nowrap",
              }}
            >
              {formatBps(marketItem.apr)}%
              <Box
                component="span"
                sx={{
                  marginLeft: "3px",
                  color: COLORS.matteSilver,
                  fontSize: "10px",
                  fontWeight: 500,
                  lineHeight: "16px",
                }}
              >
                APR
              </Box>
            </Typography>
            <Box
              sx={{
                width: "100%",
                minHeight: "16px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <MarketPointsChip
                chainId={marketItem.chainId}
                marketAddress={marketItem.id}
                apr={marketItem.apr}
              />
            </Box>
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
                opacity: 0.8,
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
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <Typography
              sx={{
                color: COLORS.manate,
                fontSize: "11px",
                fontWeight: 500,
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              <Box
                component="span"
                sx={{
                  marginRight: "2px",
                  color: COLORS.blackRock,
                  opacity: 0.9,
                }}
              >
                {formatCompactToken(deposited)} {marketItem.asset}
              </Box>
              deposited
            </Typography>
            <Typography
              sx={{
                minWidth: 0,
                overflow: "hidden",
                color: COLORS.manate,
                fontSize: "11px",
                fontWeight: 500,
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

      {showDestinations && (
        <MobileComposableBlock
          chainId={marketItem.chainId}
          marketAddress={marketItem.id}
          marginTop="8px"
        />
      )}
    </Box>
  )
}
