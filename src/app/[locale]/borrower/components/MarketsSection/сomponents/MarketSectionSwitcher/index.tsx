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
        lineHeight: "20px",
        color: COLORS.blackRock,
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

  const prevActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.prevActive,
  )

  const neverActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.neverActive,
  )

  const yourMarketsAmount =
    depositedAmount + nonDepositedAmount + prevActiveAmount + neverActiveAmount

  const selfOnboardAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.selfOnboard,
  )

  const manualAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.manual,
  )

  const terminatedOtherAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.terminatedOther,
  )

  const otherMarketsAmount =
    selfOnboardAmount + manualAmount + terminatedOtherAmount

  return (
    <Box
      sx={{
        width: "fit-content",
        display: "flex",
        padding: "0 16px",
      }}
    >
      <SwitcherButton
        label={t("dashboard.markets.switcher.yourMarkets")}
        amount={yourMarketsAmount}
        section={BorrowerMarketDashboardSections.YOUR}
      />
      <SwitcherButton
        label={t("dashboard.markets.switcher.otherMarkets")}
        amount={otherMarketsAmount}
        section={BorrowerMarketDashboardSections.OTHER}
      />
    </Box>
  )
}
