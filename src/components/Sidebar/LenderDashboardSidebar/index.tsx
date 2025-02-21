import { Box, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import Markets from "@/assets/icons/markets_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setScrollTarget,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"

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

  const marketsAmount =
    activeMarketsAmount + closedMarketsAmount + otherMarketsAmount

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardPageAccordion
        open
        label={t("dashboard.markets.title")}
        amount={marketsAmount}
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
      >
        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.borrower.active.title")}
          amount={activeMarketsAmount}
          open={marketSection === LenderMarketDashboardSections.ACTIVE}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.ACTIVE)
          }
        >
          <DashboardButton
            label={t("dashboard.markets.tables.borrower.active.deposited")}
            amount={depositedAmount}
            onClick={() => handleScrollToTable("deposited")}
          />
          <DashboardButton
            label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
            amount={nonDepositedAmount}
            onClick={() => handleScrollToTable("non-deposited")}
          />
          {/* <DashboardButton */}
          {/*  label="Outstanding Withdrawals" */}
          {/*  onClick={() => handleScrollToTable("outstanding")} */}
          {/* /> */}
        </DashboardSectionAccordion>

        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.borrower.closed.title")}
          amount={closedMarketsAmount}
          open={marketSection === LenderMarketDashboardSections.TERMINATED}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.TERMINATED)
          }
        >
          <DashboardButton
            label={t("dashboard.markets.tables.borrower.closed.prevActive")}
            amount={prevActiveAmount}
            onClick={() => handleScrollToTable("prev-active")}
          />
          <DashboardButton
            label={t("dashboard.markets.tables.borrower.closed.neverActive")}
            amount={neverActiveAmount}
            onClick={() => handleScrollToTable("never-active")}
          />
        </DashboardSectionAccordion>

        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.other.title")}
          amount={otherMarketsAmount}
          open={marketSection === LenderMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.OTHER)
          }
        >
          <DashboardButton
            label={t("dashboard.markets.tables.other.selfOnboard")}
            amount={selfOnboardAmount}
            onClick={() => handleScrollToTable("self-onboard")}
          />
          <DashboardButton
            label={t("dashboard.markets.tables.other.manual")}
            amount={manualAmount}
            onClick={() => handleScrollToTable("manual")}
          />
        </DashboardSectionAccordion>
      </DashboardPageAccordion>
    </Box>
  )
}
