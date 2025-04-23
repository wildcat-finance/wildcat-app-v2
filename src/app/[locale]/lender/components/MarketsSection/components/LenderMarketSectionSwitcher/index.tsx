import React, { useState, useEffect } from "react"

import { Box, Button, Typography, Menu, MenuItem } from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
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
  const dispatch = useAppDispatch()
  const [isMobile, setIsMobile] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
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

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSectionChange = (section: LenderMarketDashboardSections) => {
    dispatch(setMarketSection(section))
    handleClose()
  }

  // Current section label
  const getCurrentSectionLabel = () => {
    switch (marketSection) {
      case LenderMarketDashboardSections.ACTIVE:
        return t("dashboard.markets.tables.borrower.active.title")
      case LenderMarketDashboardSections.TERMINATED:
        return t("dashboard.markets.tables.borrower.closed.title")
      case LenderMarketDashboardSections.OTHER:
        return t("dashboard.markets.tables.other.title")
      default:
        return t("dashboard.markets.tables.borrower.active.title")
    }
  }

  const getCurrentSectionAmount = () => {
    switch (marketSection) {
      case LenderMarketDashboardSections.ACTIVE:
        return activeMarketsAmount
      case LenderMarketDashboardSections.TERMINATED:
        return closedMarketsAmount
      case LenderMarketDashboardSections.OTHER:
        return otherMarketsAmount
      default:
        return activeMarketsAmount
    }
  }

  if (isMobile) {
    return (
      <Box sx={{ width: "100%", mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            width: "100%",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderColor: COLORS.blackRock006,
            color: COLORS.blackRock,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {getCurrentSectionLabel()}
            {getCurrentSectionAmount() !== 0 && (
              <Typography
                variant="text3"
                color={COLORS.santasGrey}
                sx={{ lineHeight: "20px" }}
              >
                {getCurrentSectionAmount()}
              </Typography>
            )}
          </Box>
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          sx={{ width: "100%" }}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
        >
          <MenuItem 
            onClick={() => handleSectionChange(LenderMarketDashboardSections.ACTIVE)}
            sx={{ 
              backgroundColor: marketSection === LenderMarketDashboardSections.ACTIVE 
                ? COLORS.whiteSmoke 
                : "transparent"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {t("dashboard.markets.tables.borrower.active.title")}
              {activeMarketsAmount !== 0 && (
                <Typography
                  variant="text3"
                  color={COLORS.santasGrey}
                  sx={{ lineHeight: "20px" }}
                >
                  {activeMarketsAmount}
                </Typography>
              )}
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => handleSectionChange(LenderMarketDashboardSections.TERMINATED)}
            sx={{ 
              backgroundColor: marketSection === LenderMarketDashboardSections.TERMINATED 
                ? COLORS.whiteSmoke 
                : "transparent"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {t("dashboard.markets.tables.borrower.closed.title")}
              {closedMarketsAmount !== 0 && (
                <Typography
                  variant="text3"
                  color={COLORS.santasGrey}
                  sx={{ lineHeight: "20px" }}
                >
                  {closedMarketsAmount}
                </Typography>
              )}
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => handleSectionChange(LenderMarketDashboardSections.OTHER)}
            sx={{ 
              backgroundColor: marketSection === LenderMarketDashboardSections.OTHER 
                ? COLORS.whiteSmoke 
                : "transparent"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {t("dashboard.markets.tables.other.title")}
              {otherMarketsAmount !== 0 && (
                <Typography
                  variant="text3"
                  color={COLORS.santasGrey}
                  sx={{ lineHeight: "20px" }}
                >
                  {otherMarketsAmount}
                </Typography>
              )}
            </Box>
          </MenuItem>
        </Menu>
      </Box>
    )
  }

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
