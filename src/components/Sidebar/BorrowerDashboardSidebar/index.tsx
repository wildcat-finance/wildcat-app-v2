import { Box, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import Markets from "@/assets/icons/markets_icon.svg"
import Policies from "@/assets/icons/policies_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerDashboardSections,
  BorrowerMarketDashboardSections,
  resetMarketSection,
  setMarketSection,
  setScrollTarget,
  setSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

import {
  DashboardButton,
  DashboardPageAccordion,
  DashboardSectionAccordion,
} from "../DashboardSidebarComponents"

export const BorrowerDashboardSidebar = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const section = useAppSelector((state) => state.borrowerDashboard.section)
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )
  const showFullFunctionality = useAppSelector(
    (state) => state.borrowerDashboard.showFullFunctionality,
  )

  const handleChangeSection = (selectedSection: BorrowerDashboardSections) => {
    dispatch(setSection(selectedSection))
    dispatch(resetMarketSection())
  }

  const handleChangeMarketSection = (
    selectedMarketSection: BorrowerMarketDashboardSections,
  ) => {
    dispatch(setMarketSection(selectedMarketSection))
  }

  const handleScrollToTable = (target: string) => {
    dispatch(setScrollTarget(target))
  }

  const policiesAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.policies,
  )

  const depositedAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.deposited,
  )

  const nonDepositedAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.nonDeposited,
  )

  const activeMarketsAmount = depositedAmount + nonDepositedAmount

  const prevActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.prevActive,
  )

  const neverActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.neverActive,
  )

  const closedMarketsAmount = prevActiveAmount + neverActiveAmount

  const selfOnboardAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.selfOnboard,
  )

  const manualAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.manual,
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
        label={t("dashboard.markets.title")}
        amount={marketsAmount}
        open={section === BorrowerDashboardSections.MARKETS}
        onClick={() => handleChangeSection(BorrowerDashboardSections.MARKETS)}
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
      >
        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.borrower.active.title")}
          amount={activeMarketsAmount}
          open={marketSection === BorrowerMarketDashboardSections.ACTIVE}
          onClick={() =>
            handleChangeMarketSection(BorrowerMarketDashboardSections.ACTIVE)
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
          open={marketSection === BorrowerMarketDashboardSections.TERMINATED}
          onClick={() =>
            handleChangeMarketSection(
              BorrowerMarketDashboardSections.TERMINATED,
            )
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
          open={marketSection === BorrowerMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(BorrowerMarketDashboardSections.OTHER)
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

      {/* {showFullFunctionality && ( */}
      {/*  <DashboardPageAccordion */}
      {/*    label="Lenders" */}
      {/*    open={section === BorrowerDashboardSections.LENDERS} */}
      {/*    onClick={() => handleChangeSection(BorrowerDashboardSections.LENDERS)} */}
      {/*    icon={ */}
      {/*      <SvgIcon sx={{ marginRight: "10px" }}> */}
      {/*        <Lenders /> */}
      {/*      </SvgIcon> */}
      {/*    } */}
      {/*  > */}
      {/*    <DashboardSectionAccordion */}
      {/*      label="Active Lenders" */}
      {/*      open={false} */}
      {/*      hideIndicator */}
      {/*      onClick={() => handleScrollToTable("active")} */}
      {/*    /> */}
      {/*    <DashboardSectionAccordion */}
      {/*      label="Deleted Lenders" */}
      {/*      open={false} */}
      {/*      hideIndicator */}
      {/*      onClick={() => handleScrollToTable("deleted")} */}
      {/*    /> */}
      {/*  </DashboardPageAccordion> */}
      {/* )} */}

      {showFullFunctionality && (
        <DashboardPageAccordion
          label="Policies"
          amount={policiesAmount}
          open={section === BorrowerDashboardSections.POLICIES}
          onClick={() =>
            handleChangeSection(BorrowerDashboardSections.POLICIES)
          }
          hideAccordionButton
          icon={
            <SvgIcon sx={{ marginRight: "10px" }}>
              <Policies />
            </SvgIcon>
          }
        />
      )}
    </Box>
  )
}
