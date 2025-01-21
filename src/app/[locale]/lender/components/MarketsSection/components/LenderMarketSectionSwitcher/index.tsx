import React from "react"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

export const LenderMarketSectionSwitcher = () => {
  const { t } = useTranslation()
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
    <Box sx={{ width: "fit-content", display: "flex", gap: "12px" }}>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(LenderMarketDashboardSections.ACTIVE)
        }
        sx={{
          fontWeight:
            marketSection === LenderMarketDashboardSections.ACTIVE ? 600 : 500,
          backgroundColor:
            marketSection === LenderMarketDashboardSections.ACTIVE
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.borrower.active.title")}
      </Button>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(LenderMarketDashboardSections.TERMINATED)
        }
        sx={{
          fontWeight:
            marketSection === LenderMarketDashboardSections.TERMINATED
              ? 600
              : 500,
          backgroundColor:
            marketSection === LenderMarketDashboardSections.TERMINATED
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.borrower.closed.title")}
      </Button>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(LenderMarketDashboardSections.OTHER)
        }
        sx={{
          fontWeight:
            marketSection === LenderMarketDashboardSections.OTHER ? 600 : 500,
          backgroundColor:
            marketSection === LenderMarketDashboardSections.OTHER
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.other.title")}
      </Button>
    </Box>
  )
}
