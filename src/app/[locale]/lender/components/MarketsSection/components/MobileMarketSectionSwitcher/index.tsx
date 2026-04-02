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
        flexShrink: 0,
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

  const terminatedOtherAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.terminatedOther,
  )

  const otherMarketsAmount =
    selfOnboardAmount + manualAmount + terminatedOtherAmount

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
          {t("marketDetailsLender.mobile.markets")}
        </Typography>

        {children}
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          overflowX: "auto",
          flexWrap: "nowrap",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        <MobileSwitcherButton
          // label={t("dashboard.tables.borrower.activeTitle")}
          label={t("marketDetailsLender.mobile.yours")}
          amount={activeMarketsAmount}
          section={LenderMarketDashboardSections.ACTIVE}
        />

        <MobileSwitcherButton
          // label={t("dashboard.tables.borrower.closedTitle")}
          label={t("marketDetailsLender.mobile.yourTerminated")}
          amount={closedMarketsAmount}
          section={LenderMarketDashboardSections.TERMINATED}
        />

        <MobileSwitcherButton
          // label={t("dashboard.tables.other.title")}
          label={t("marketDetailsLender.mobile.others")}
          amount={otherMarketsAmount}
          section={LenderMarketDashboardSections.OTHER}
        />
      </Box>

      <Divider />

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginTop: "10px",
        }}
      >
        {marketSection === LenderMarketDashboardSections.ACTIVE && (
          <>
            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.active")}
              target="deposited"
              amount={depositedAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.nonDeposited")}
              target="non-deposited"
              amount={nonDepositedAmount}
              type="secondary"
            />
          </>
        )}

        {marketSection === LenderMarketDashboardSections.TERMINATED && (
          <>
            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.prevActive")}
              target="prev-active"
              amount={prevActiveAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.neverActive")}
              target="never-active"
              amount={neverActiveAmount}
              type="secondary"
            />
          </>
        )}

        {marketSection === LenderMarketDashboardSections.OTHER && (
          <>
            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.selfOnboarded")}
              target="self-onboard"
              amount={selfOnboardAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.onboardedByBorrower")}
              target="manual"
              amount={manualAmount}
              type="secondary"
            />

            <MobileSwitcherButton
              label={t("marketDetailsLender.mobile.terminated")}
              target="other-terminated"
              amount={terminatedOtherAmount}
              type="secondary"
            />
          </>
        )}
      </Box>
    </Box>
  )
}
