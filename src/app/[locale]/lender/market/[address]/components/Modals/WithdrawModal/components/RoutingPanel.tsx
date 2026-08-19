import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

export type RoutingPanelProps = {
  directUsed: string
  directAvailable: string
  wrappedUsed: string
  wrappedAvailable: string
  symbol: string
  /** Left-hand hint describing the consequence of the current amount. */
  hint: string
  /** Amber when the route requires an unwrap. */
  hintWarn?: boolean
  /** Right-hand transaction-count summary. */
  txSummary: string
}

const Row = ({
  label,
  used,
  available,
  symbol,
}: {
  label: string
  used: string
  available: string
  symbol: string
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "12px",
    }}
  >
    <Typography variant="text3" color={COLORS.blackRock}>
      {label}
    </Typography>
    <Typography variant="text3" color={COLORS.santasGrey}>
      <Typography component="span" variant="text3" color={COLORS.blackRock}>
        {used}
      </Typography>
      {` / ${available} ${symbol}`}
    </Typography>
  </Box>
)

/**
 * Makes automatic routing honest: shows how much of the amount comes from the
 * direct balance, how much has to be unwrapped, and how many transactions that
 * costs — before the lender signs anything.
 */
export const RoutingPanel = ({
  directUsed,
  directAvailable,
  wrappedUsed,
  wrappedAvailable,
  symbol,
  hint,
  hintWarn,
  txSummary,
}: RoutingPanelProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "14px 16px",
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "12px",
        backgroundColor: COLORS.hintOfRed,
      }}
    >
      <Row
        label={t("marketDetails.lender.transactions.withdraw.routing.direct")}
        used={directUsed}
        available={directAvailable}
        symbol={symbol}
      />
      <Row
        label={t("marketDetails.lender.transactions.withdraw.routing.wrapped")}
        used={wrappedUsed}
        available={wrappedAvailable}
        symbol={symbol}
      />

      <Divider sx={{ borderColor: COLORS.whiteLilac }} />

      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Typography
          variant="text3"
          color={hintWarn ? COLORS.butteredRum : COLORS.santasGrey}
        >
          {hint}
        </Typography>
        <Typography
          variant="text3"
          fontWeight={600}
          color={COLORS.blackRock}
          whiteSpace="nowrap"
        >
          {txSummary}
        </Typography>
      </Box>
    </Box>
  )
}
