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
    <Typography sx={{ fontSize: "13px", lineHeight: "18px" }}>
      {asset}
    </Typography>
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
  const config = getAdsConfig(chainId, marketAddress)
  if (!config) return null

  const multiplier = config.proposalText.match(/[\d.]+x/i)?.[0]
  const tooltip = getAdsTooltipComponent(chainId, marketAddress, formatBps(apr))
  const { ProposalIcon } = config

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
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          cursor: "help",
        }}
      >
        {multiplier && (
          <Typography sx={{ fontSize: "13px", lineHeight: "18px" }}>
            +{multiplier}
          </Typography>
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "2px 10px 2px 2px",
            borderRadius: "12px",
            backgroundColor: COLORS.bunker,
          }}
        >
          <SvgIcon sx={{ width: "18px", height: "18px" }}>
            <ProposalIcon />
          </SvgIcon>
          <Typography
            sx={{
              color: COLORS.white,
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: "18px",
            }}
          >
            {config.proposalChipLabel}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  )
}

export const MobileMarketCard = ({
  marketItem,
  isLast = false,
  showBorrower = true,
  baseRoute = ROUTES.lender.market,
}: {
  marketItem: LenderMobileMarketItem
  isLast?: boolean
  showBorrower?: boolean
  baseRoute?: string
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
  const withdrawal = `${formatSecsToHours(
    marketItem.withdrawalBatchDuration,
    true,
  )} withdrawal`
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
        position: "relative",
        backgroundColor: COLORS.white,
        color: "inherit",
        cursor: "pointer",
        textDecoration: "none",
        ...(!isLast && {
          "&::after": {
            content: '""',
            position: "absolute",
            left: "16px",
            right: "16px",
            bottom: 0,
            height: "1px",
            backgroundColor: COLORS.iron,
          },
        }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MarketStatusAndTermChip
          status={marketItem.status}
          termLabel={termLabel}
        />
        <Typography
          sx={{
            minWidth: 0,
            overflow: "hidden",
            color: COLORS.blackRock,
            fontSize: "14px",
            lineHeight: "20px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          • {withdrawal}
        </Typography>
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
          sx={{
            minWidth: 0,
            overflow: "hidden",
            color: COLORS.blackRock,
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: "22px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {marketItem.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", flexShrink: 0 }}>
          <Typography
            sx={{ fontSize: "20px", fontWeight: 600, lineHeight: "26px" }}
          >
            {formatBps(marketItem.apr)}%
          </Typography>
          <Typography
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
