import React, { ReactNode, useEffect } from "react"

import { Box, Button, Divider, IconButton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setScrollTarget,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

const MobileSwitcherButton = ({
  label,
  section,
  amount,
  type = "main",
  target,
}: {
  label: string
  section?: LenderMarketDashboardSections
  amount?: number
  type?: "main" | "secondary"
  target?: string
}) => {
  const dispatch = useAppDispatch()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const handleChangeMarketSection = (
    selectedMarketSection: LenderMarketDashboardSections,
  ) => {
    dispatch(setMarketSection(selectedMarketSection))
  }

  const handleScrollToTable = () => {
    dispatch(setScrollTarget(target as string))
  }

  return (
    <Button
      variant="text"
      onClick={
        type === "main"
          ? () =>
              handleChangeMarketSection(
                section as LenderMarketDashboardSections,
              )
          : () => handleScrollToTable()
      }
      sx={{
        borderRadius: "10px",
        gap: "6px",
        padding: "4px 16px",
        fontSize: "12px",
        lineHeight: "20px",
        fontWeight: marketSection === section ? 600 : 500,
        color:
          type === "secondary" && scrollTargetId === target
            ? COLORS.ultramarineBlue
            : COLORS.blackRock,
        backgroundColor:
          // eslint-disable-next-line no-nested-ternary
          type === "main"
            ? marketSection === section
              ? COLORS.whiteSmoke
              : "transparent"
            : scrollTargetId === target
              ? "#E4EBFE80"
              : "transparent",
        "&:hover": {
          boxShadow: "none",
          backgroundColor:
            scrollTargetId === target ? "#E4EBFE80" : COLORS.hintOfRed,
          color:
            scrollTargetId === target
              ? COLORS.ultramarineBlue
              : COLORS.blackRock08,
        },
      }}
    >
      {label}
      {amount !== 0 && (
        <Typography
          variant="mobText3"
          color={
            type === "secondary" && scrollTargetId === target
              ? COLORS.blueRibbon
              : COLORS.santasGrey
          }
        >
          {amount}
        </Typography>
      )}
    </Button>
  )
}

export const MobileMarketSectionHeader = ({
  children,
}: {
  children: ReactNode
}) => {
  const { t } = useTranslation()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

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

  const dispatch = useAppDispatch()

  useEffect(() => {
    if (marketSection === LenderMarketDashboardSections.ACTIVE) {
      dispatch(setScrollTarget("deposited"))
    }
    if (marketSection === LenderMarketDashboardSections.TERMINATED) {
      dispatch(setScrollTarget("prev-active"))
    }
    if (marketSection === LenderMarketDashboardSections.OTHER) {
      dispatch(setScrollTarget("self-onboard"))
    }
  }, [marketSection])

  return (
    <Box
      sx={{
        width: "100%",
        padding: "16px 8px",
        borderRadius: "14px",
        backgroundColor: COLORS.white,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <Typography variant="mobH2" marginLeft="12px">
          Markets
        </Typography>

        {children}
      </Box>

      <Box
        sx={{
          width: "fit-content",
          display: "flex",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        <MobileSwitcherButton
          // label={t("dashboard.markets.tables.borrower.active.title")}
          label="Yours"
          amount={activeMarketsAmount}
          section={LenderMarketDashboardSections.ACTIVE}
        />

        <MobileSwitcherButton
          // label={t("dashboard.markets.tables.borrower.closed.title")}
          label="Yours Terminated"
          amount={closedMarketsAmount}
          section={LenderMarketDashboardSections.TERMINATED}
        />

        <MobileSwitcherButton
          // label={t("dashboard.markets.tables.other.title")}
          label="Others"
          amount={otherMarketsAmount}
          section={LenderMarketDashboardSections.OTHER}
        />
      </Box>

      <Divider />

      <Box
        sx={{
          width: "fit-content",
          display: "flex",
          gap: "6px",
          marginTop: "10px",
        }}
      >
        {marketSection === LenderMarketDashboardSections.ACTIVE && (
          <>
            <MobileSwitcherButton
              label="Active"
              target="deposited"
              amount={depositedAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label="Non-Deposited"
              target="non-deposited"
              amount={nonDepositedAmount}
              type="secondary"
            />
          </>
        )}

        {marketSection === LenderMarketDashboardSections.TERMINATED && (
          <>
            <MobileSwitcherButton
              label="Prev. Active"
              target="prev-active"
              amount={prevActiveAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label="Never Active"
              target="never-active"
              amount={neverActiveAmount}
              type="secondary"
            />
          </>
        )}

        {marketSection === LenderMarketDashboardSections.OTHER && (
          <>
            <MobileSwitcherButton
              label="Self Onboarded"
              target="self-onboard"
              amount={selfOnboardAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label="Onboarded by Borrower"
              target="manual"
              amount={manualAmount}
              type="secondary"
            />
          </>
        )}
      </Box>
    </Box>
  )
}
