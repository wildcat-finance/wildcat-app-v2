import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

const SwitcherButton = ({
  label,
  section,
  amount,
}: {
  label: string
  section: LenderMarketDashboardSections
  amount?: number
}) => {
  const dispatch = useAppDispatch()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const handleChangeMarketSection = (
    selectedMarketSection: LenderMarketDashboardSections,
  ) => {
    dispatch(setMarketSection(selectedMarketSection))
  }

  return (
    <Button
      variant="text"
      onClick={() => handleChangeMarketSection(section)}
      sx={{
        gap: "6px",
        padding: "6px 16px",
        fontWeight: marketSection === section ? 600 : 500,
        backgroundColor:
          marketSection === section ? COLORS.whiteSmoke : "transparent",
      }}
    >
      {label}
      {amount !== 0 && (
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ lineHeight: "20px" }}
        >
          {amount}
        </Typography>
      )}
    </Button>
  )
}

export const LenderMarketSectionSwitcher = () => {
  const { t } = useTranslation()

  const depositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.deposited,
  )

  const nonDepositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.nonDeposited,
  )

  const activeMarketsAmount = depositedAmount + nonDepositedAmount

  const prevActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.prevActive,
  )

  const neverActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.neverActive,
  )

  const closedMarketsAmount = prevActiveAmount + neverActiveAmount

  const selfOnboardAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.selfOnboard,
  )

  const manualAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.manual,
  )

  const otherMarketsAmount = selfOnboardAmount + manualAmount

  return (
    <Box
      sx={{
        width: "fit-content",
        display: "flex",
        gap: "12px",
        padding: "0 24px",
      }}
    >
      <SwitcherButton
        label={t("dashboard.markets.tables.borrower.active.title")}
        amount={activeMarketsAmount}
        section={LenderMarketDashboardSections.ACTIVE}
      />

      <SwitcherButton
        label={t("dashboard.markets.tables.borrower.closed.title")}
        amount={closedMarketsAmount}
        section={LenderMarketDashboardSections.TERMINATED}
      />

      <SwitcherButton
        label={t("dashboard.markets.tables.other.title")}
        amount={otherMarketsAmount}
        section={LenderMarketDashboardSections.OTHER}
      />
    </Box>
  )
}
