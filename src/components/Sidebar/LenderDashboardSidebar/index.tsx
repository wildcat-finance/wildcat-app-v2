import { Box, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import Markets from "@/assets/icons/markets_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setScrollTarget,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

import {
  DashboardButton,
  DashboardPageAccordion,
  DashboardSectionAccordion,
} from "../DashboardSidebarComponents"

export const LenderDashboardSidebar = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const showFullFunctionality = useAppSelector(
    (state) => state.lenderDashboard.showFullFunctionality,
  )

  const handleChangeMarketSection = (
    selectedMarketSection: LenderMarketDashboardSections,
  ) => {
    dispatch(setMarketSection(selectedMarketSection))
  }

  const handleScrollToTable = (target: string) => {
    dispatch(setScrollTarget(target))
  }

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardPageAccordion
        label={t("dashboard.markets.title")}
        open
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
      >
        {showFullFunctionality && (
          <DashboardSectionAccordion
            label={t("dashboard.markets.tables.borrower.active.title")}
            open={marketSection === LenderMarketDashboardSections.ACTIVE}
            onClick={() =>
              handleChangeMarketSection(LenderMarketDashboardSections.ACTIVE)
            }
          >
            <DashboardButton
              label={t("dashboard.markets.tables.borrower.active.deposited")}
              onClick={() => handleScrollToTable("deposited")}
            />
            <DashboardButton
              label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
              onClick={() => handleScrollToTable("non-deposited")}
            />
            {/* <DashboardButton */}
            {/*  label="Outstanding Withdrawals" */}
            {/*  onClick={() => handleScrollToTable("outstanding")} */}
            {/* /> */}
          </DashboardSectionAccordion>
        )}

        {showFullFunctionality && (
          <DashboardSectionAccordion
            label={t("dashboard.markets.tables.borrower.closed.title")}
            open={marketSection === LenderMarketDashboardSections.TERMINATED}
            onClick={() =>
              handleChangeMarketSection(
                LenderMarketDashboardSections.TERMINATED,
              )
            }
          >
            <DashboardButton
              label={t("dashboard.markets.tables.borrower.closed.prevActive")}
              onClick={() => handleScrollToTable("prev-active")}
            />
            <DashboardButton
              label={t("dashboard.markets.tables.borrower.closed.neverActive")}
              onClick={() => handleScrollToTable("never-active")}
            />
          </DashboardSectionAccordion>
        )}

        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.other.title")}
          open={marketSection === LenderMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.OTHER)
          }
        >
          <DashboardButton
            label={t("dashboard.markets.tables.other.selfOnboard")}
            onClick={() => handleScrollToTable("self-onboard")}
          />
          <DashboardButton
            label={t("dashboard.markets.tables.other.manual")}
            onClick={() => handleScrollToTable("manual")}
          />
        </DashboardSectionAccordion>
      </DashboardPageAccordion>
    </Box>
  )
}
