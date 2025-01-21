import React from "react"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerMarketDashboardSections,
  setMarketSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

export const MarketSectionSwitcher = () => {
  const { t } = useTranslation()
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
    <Box sx={{ width: "fit-content", display: "flex", gap: "12px" }}>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(BorrowerMarketDashboardSections.ACTIVE)
        }
        sx={{
          fontWeight:
            marketSection === BorrowerMarketDashboardSections.ACTIVE
              ? 600
              : 500,
          backgroundColor:
            marketSection === BorrowerMarketDashboardSections.ACTIVE
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.borrower.active.title")}
      </Button>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(BorrowerMarketDashboardSections.TERMINATED)
        }
        sx={{
          fontWeight:
            marketSection === BorrowerMarketDashboardSections.TERMINATED
              ? 600
              : 500,
          backgroundColor:
            marketSection === BorrowerMarketDashboardSections.TERMINATED
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.borrower.closed.title")}
      </Button>
      <Button
        variant="text"
        onClick={() =>
          handleChangeMarketSection(BorrowerMarketDashboardSections.OTHER)
        }
        sx={{
          fontWeight:
            marketSection === BorrowerMarketDashboardSections.OTHER ? 600 : 500,
          backgroundColor:
            marketSection === BorrowerMarketDashboardSections.OTHER
              ? COLORS.whiteSmoke
              : "transparent",
        }}
      >
        {t("dashboard.markets.tables.other.title")}
      </Button>
    </Box>
  )
}
