import { Box, Divider, Typography } from "@mui/material"
import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
} from "@/utils/formatters"
import { MarketStatus } from "@/utils/marketStatus"

import type { LenderMobileMarketItem } from "."
import {
  AprWithdrawalChipContainer,
  AprWithdrawalContainer,
  AprWithdrawalItemContainer,
  CardContainer,
  MainInfoColumnContainer,
  MainInfoContainer,
  StatusAndTermContainer,
} from "./style"

export type BorrowerMobileMarketItem = LenderMobileMarketItem & {
  utilisation?: number
}

const tokenToNumber = (amount?: TokenAmount): number => {
  if (!amount) return 0
  return parseFloat(amount.format(amount.decimals))
}

const formatCompact = (value: number): string => {
  if (value === 0) return "0"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return value.toFixed(2)
  if (abs < 0.0001) return "<0.0001"
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

const utilisationFill = (pct: number) => {
  if (pct <= 0) return { fill: COLORS.iron, label: COLORS.santasGrey }
  if (pct > 100) return { fill: COLORS.dullRed, label: COLORS.dullRed }
  if (pct >= 80) return { fill: COLORS.galliano, label: COLORS.butteredRum }
  return { fill: COLORS.ultramarineBlue, label: COLORS.ultramarineBlue }
}

const UtilisationBar = ({
  utilisation,
  capacity,
  asset,
}: {
  utilisation: number
  capacity?: TokenAmount
  asset: string
}) => {
  const clamped = Math.max(0, Math.min(100, utilisation))
  const colors = utilisationFill(utilisation)
  const capValue = tokenToNumber(capacity)
  const capLabel =
    capValue > 0 ? `${formatCompact(capValue)} ${asset} Cap` : "No cap set"
  const pctLabel = `${utilisation.toFixed(
    utilisation >= 10 || utilisation === 0 ? 0 : 1,
  )}% utilisation`

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <Box
        sx={{
          width: "100%",
          height: "4px",
          borderRadius: "2px",
          backgroundColor: COLORS.athensGrey,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: `${clamped}%`,
            height: "100%",
            backgroundColor: colors.fill,
            borderRadius: "2px",
            transition: "width 0.2s ease",
          }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="mobText4" color={COLORS.santasGrey}>
          {capLabel}
        </Typography>
        <Typography
          variant="mobText4"
          sx={{ color: colors.label, fontWeight: utilisation > 0 ? 600 : 400 }}
        >
          {pctLabel}
        </Typography>
      </Box>
    </Box>
  )
}

// Retain the analytics profile's debt/utilisation card alongside the current
// lender dashboard card.
export const BorrowerMobileMarketCard = ({
  marketItem,
  displayName,
  adsComponent,
  baseRoute,
}: {
  marketItem: BorrowerMobileMarketItem
  displayName?: string
  adsComponent?: React.ReactNode
  baseRoute?: string
}) => {
  const debtValue = tokenToNumber(marketItem.debt)
  const showStatus =
    marketItem.status.status !== MarketStatus.HEALTHY ||
    marketItem.status.healthyPeriod
  const showTerm = marketItem.term.kind !== HooksKind.OpenTerm

  return (
    <Link
      href={buildMarketHref(marketItem.id, marketItem.chainId, baseRoute)}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Box sx={CardContainer}>
        {(showStatus || showTerm) && (
          <Box sx={StatusAndTermContainer}>
            {showStatus ? (
              <MarketStatusChip status={marketItem.status} withPeriod />
            ) : (
              <Box />
            )}
            {showTerm && (
              <MarketTypeChip type="table" {...marketItem.term} isMobile />
            )}
          </Box>
        )}
        <Box sx={MainInfoContainer}>
          <Box sx={{ ...MainInfoColumnContainer, minWidth: 0 }}>
            <Typography
              variant="mobText2"
              sx={{
                display: "block",
                width: "100%",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                fontWeight: 600,
              }}
            >
              {displayName ?? marketItem.name}
            </Typography>
          </Box>
          <Box
            sx={{
              ...MainInfoColumnContainer,
              alignItems: "flex-end",
              width: "fit-content",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="mobText2"
              sx={{
                fontWeight: 700,
                color: debtValue > 0 ? COLORS.blackRock : COLORS.santasGrey,
              }}
            >
              {formatCompact(debtValue)} {marketItem.asset}
            </Typography>
            <Typography variant="mobText4" color={COLORS.santasGrey}>
              Debt
            </Typography>
          </Box>
        </Box>
        <UtilisationBar
          utilisation={marketItem.utilisation ?? 0}
          capacity={marketItem.capacity}
          asset={marketItem.asset}
        />
        <Divider />
        <Box sx={AprWithdrawalContainer}>
          <Box sx={AprWithdrawalItemContainer}>
            <Typography variant="mobText4">Base APR</Typography>
            <Box sx={AprWithdrawalChipContainer}>
              <Typography variant="mobText4">{`${formatBps(
                marketItem.apr,
              )}%`}</Typography>
            </Box>
          </Box>
          <Box sx={AprWithdrawalItemContainer}>
            <Typography variant="mobText4">Withdrawal</Typography>
            <Box sx={AprWithdrawalChipContainer}>
              <Typography variant="mobText4">
                {formatSecsToHours(marketItem.withdrawalBatchDuration, true)}
              </Typography>
            </Box>
          </Box>
        </Box>
        {adsComponent && <Box sx={{ marginTop: "-4px" }}>{adsComponent}</Box>}
      </Box>
    </Link>
  )
}
