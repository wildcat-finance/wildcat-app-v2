import React, { ReactNode } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderAllMarketsTab,
  setAllMarketsTab,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

const MobileSwitcherButton = ({
  label,
  target,
  amount,
}: {
  label: string
  target: LenderAllMarketsTab
  amount?: number
}) => {
  const dispatch = useAppDispatch()
  const selectedTab = useAppSelector(
    (state) => state.lenderDashboard.allMarketsTab,
  )

  return (
    <Button
      variant="text"
      onClick={() => dispatch(setAllMarketsTab(target))}
      sx={{
        borderRadius: "10px",
        gap: "6px",
        padding: "4px 16px",
        flexShrink: 0,
        fontSize: "12px",
        lineHeight: "20px",
        fontWeight: selectedTab === target ? 600 : 500,
        color:
          selectedTab === target ? COLORS.ultramarineBlue : COLORS.blackRock,
        backgroundColor: selectedTab === target ? "#E4EBFE80" : "transparent",
        "&:hover": {
          boxShadow: "none",
          backgroundColor:
            selectedTab === target ? "#E4EBFE80" : COLORS.hintOfRed,
          color:
            selectedTab === target
              ? COLORS.ultramarineBlue
              : COLORS.blackRock08,
        },
      }}
    >
      {label}
      {amount !== undefined && amount !== 0 && (
        <Typography
          variant="mobText3"
          color={selectedTab === target ? COLORS.blueRibbon : COLORS.santasGrey}
        >
          {amount}
        </Typography>
      )}
    </Button>
  )
}

export const MobileHeader = ({ children }: { children?: ReactNode }) => {
  const { t } = useTranslation()

  const selfOnboardAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.selfOnboard,
  )
  const manualAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.manual,
  )
  const terminatedOtherAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.terminatedOther,
  )

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
        }}
      >
        <Typography variant="mobH2" marginLeft="12px">
          {t("dashboard.markets.allMarketsTitle")}
        </Typography>
        {children}
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginTop: "10px",
        }}
      >
        <MobileSwitcherButton
          label={t("dashboard.markets.tables.other.selfOnboard")}
          target={LenderAllMarketsTab.SELF_ONBOARD}
          amount={selfOnboardAmount}
        />
        <MobileSwitcherButton
          label={t("dashboard.markets.tables.other.manual")}
          target={LenderAllMarketsTab.MANUAL}
          amount={manualAmount}
        />
        <MobileSwitcherButton
          label={t("dashboard.markets.tables.other.terminated")}
          target={LenderAllMarketsTab.TERMINATED}
          amount={terminatedOtherAmount}
        />
      </Box>
    </Box>
  )
}
