import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerMarketDashboardSections,
  setMarketSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

const SwitcherButton = ({
  label,
  section,
  amount,
}: {
  label: string
  section: BorrowerMarketDashboardSections
  amount?: number
}) => {
  const dispatch = useAppDispatch()

  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const handleChangeMarketSection = (
    selectedMarketSection: BorrowerMarketDashboardSections,
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

export const MarketSectionSwitcher = () => {
  const { t } = useTranslation()

  const depositedAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.deposited,
  )

  const nonDepositedAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.nonDeposited,
  )

  const activeMarketsAmount = depositedAmount + nonDepositedAmount

  const prevActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.prevActive,
  )

  const neverActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.neverActive,
  )

  const closedMarketsAmount = prevActiveAmount + neverActiveAmount

  const selfOnboardAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.selfOnboard,
  )

  const manualAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.manual,
  )

  const otherMarketsAmount = selfOnboardAmount + manualAmount

  return (
    <Box sx={{ width: "fit-content", display: "flex" }}>
      <SwitcherButton
        label={t("dashboard.markets.tables.borrower.active.title")}
        amount={activeMarketsAmount}
        section={BorrowerMarketDashboardSections.ACTIVE}
      />

      <SwitcherButton
        label={t("dashboard.markets.tables.borrower.closed.title")}
        amount={closedMarketsAmount}
        section={BorrowerMarketDashboardSections.TERMINATED}
      />

      <SwitcherButton
        label={t("dashboard.markets.tables.other.title")}
        amount={otherMarketsAmount}
        section={BorrowerMarketDashboardSections.OTHER}
      />
    </Box>
  )
}
