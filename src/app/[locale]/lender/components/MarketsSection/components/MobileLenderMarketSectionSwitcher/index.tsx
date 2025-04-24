import React from "react"
import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { LenderMarketDashboardSections, setMarketSection } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

type SwitcherButtonProps = {
  label: string
  amount: number
  section: LenderMarketDashboardSections
}

const SwitcherButton = ({ label, amount, section }: SwitcherButtonProps) => {
  const dispatch = useAppDispatch()
  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  return (
    <Box
      onClick={() => dispatch(setMarketSection(section))}
      sx={{
        padding: "8px 12px",
        backgroundColor:
          marketSection === section ? COLORS.whiteSmoke : "transparent",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        "&:hover": {
          backgroundColor: COLORS.whiteSmoke,
        },
      }}
    >
      <Typography
        variant="text3"
        color={COLORS.blackRock}
        sx={{ whiteSpace: "nowrap" }}
      >
        {label}
      </Typography>
      {amount !== 0 && (
        <Typography variant="text3" color={COLORS.santasGrey}>
          {amount}
        </Typography>
      )}
    </Box>
  )
}

export const MobileLenderMarketSectionSwitcher = () => {
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
    <Box sx={{ width: "fit-content", display: "flex", gap: "12px" }}>
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