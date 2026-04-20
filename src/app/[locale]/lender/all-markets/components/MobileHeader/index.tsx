import React, { ReactNode, useEffect } from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

const MobileSwitcherButton = ({
  label,
  target,
  amount,
}: {
  label: string
  target: string
  amount?: number
}) => {
  const dispatch = useAppDispatch()
  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  return (
    <Button
      variant="text"
      onClick={() => dispatch(setScrollTarget(target))}
      sx={{
        borderRadius: "10px",
        gap: "6px",
        padding: "4px 16px",
        flexShrink: 0,
        fontSize: "12px",
        lineHeight: "20px",
        fontWeight: scrollTargetId === target ? 600 : 500,
        color:
          scrollTargetId === target ? COLORS.ultramarineBlue : COLORS.blackRock,
        backgroundColor:
          scrollTargetId === target ? "#E4EBFE80" : "transparent",
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
      {amount !== undefined && amount !== 0 && (
        <Typography
          variant="mobText3"
          color={
            scrollTargetId === target ? COLORS.blueRibbon : COLORS.santasGrey
          }
        >
          {amount}
        </Typography>
      )}
    </Button>
  )
}

export const MobileHeader = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const selfOnboardAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.selfOnboard,
  )
  const manualAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.manual,
  )
  const terminatedOtherAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.terminatedOther,
  )

  useEffect(() => {
    dispatch(setScrollTarget("self-onboard"))
    return () => {
      dispatch(setScrollTarget(null))
    }
  }, [dispatch])

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
          All Markets
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
          target="self-onboard"
          amount={selfOnboardAmount}
        />
        <MobileSwitcherButton
          label={t("dashboard.markets.tables.other.manual")}
          target="manual"
          amount={manualAmount}
        />
        <MobileSwitcherButton
          label={t("dashboard.markets.tables.other.terminated")}
          target="other-terminated"
          amount={terminatedOtherAmount}
        />
      </Box>
    </Box>
  )
}
