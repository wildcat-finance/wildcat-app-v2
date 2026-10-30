import { Box, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import Markets from "@/assets/icons/markets_icon.svg"
import Policies from "@/assets/icons/policies_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerDashboardSections,
  BorrowerMarketDashboardSections,
  BorrowerMarketDashboardTabs,
  resetMarketSection,
  setMarketSection,
  setMarketTab,
  setSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

import {
  DashboardPageAccordion,
  DashboardSectionAccordion,
  DashboardSubItems,
} from "../DashboardSidebarComponents"

export const BorrowerDashboardSidebar = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const section = useAppSelector((state) => state.borrowerDashboard.section)
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )
  const marketTab = useAppSelector((state) => state.borrowerDashboard.marketTab)
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

  const handleChangeMarketTab = (selectedTab: BorrowerMarketDashboardTabs) => {
    dispatch(setMarketTab(selectedTab))
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

  const prevActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.prevActive,
  )

  const neverActiveAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.neverActive,
  )

  const terminatedAmount = prevActiveAmount + neverActiveAmount

  const yourMarketsAmount =
    depositedAmount + nonDepositedAmount + terminatedAmount

  const selfOnboardAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.selfOnboard,
  )

  const manualAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.manual,
  )

  const terminatedOtherAmount = useAppSelector(
    (state) => state.borrowerDashboardAmounts.terminatedOther,
  )

  const otherMarketsAmount =
    selfOnboardAmount + manualAmount + terminatedOtherAmount

  const marketsAmount = yourMarketsAmount + otherMarketsAmount

  const countsReady = marketsAmount > 0
  const count = (amount: number) => (countsReady ? amount : undefined)
  const policiesCount =
    countsReady || policiesAmount > 0 ? policiesAmount : undefined

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        padding: "32px 16px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardPageAccordion
        label={t("dashboard.markets.title")}
        amount={count(marketsAmount)}
        open={section === BorrowerDashboardSections.MARKETS}
        onClick={() => handleChangeSection(BorrowerDashboardSections.MARKETS)}
        icon={
          <SvgIcon sx={{ fontSize: "16px", marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
        compact
      >
        {showFullFunctionality && (
          <DashboardSectionAccordion
            label={t("dashboard.markets.tables.borrower.active.title")}
            amount={count(yourMarketsAmount)}
            open={
              marketSection === BorrowerMarketDashboardSections.YOUR &&
              yourMarketsAmount > 0
            }
            onClick={() =>
              handleChangeMarketSection(BorrowerMarketDashboardSections.YOUR)
            }
            hideIndicator
            compact
          >
            <Box sx={{ paddingLeft: "14px" }}>
              <DashboardSubItems
                items={[
                  {
                    value: BorrowerMarketDashboardTabs.DEPOSITED,
                    label: t(
                      "dashboard.markets.tables.borrower.active.deposited",
                    ),
                    amount: count(depositedAmount),
                  },
                  {
                    value: BorrowerMarketDashboardTabs.NON_DEPOSITED,
                    label: t(
                      "dashboard.markets.tables.borrower.active.nonDeposited",
                    ),
                    amount: count(nonDepositedAmount),
                  },
                  {
                    value: BorrowerMarketDashboardTabs.TERMINATED,
                    label: t(
                      "dashboard.markets.tables.borrower.closed.terminatedMarkets",
                    ),
                    amount: count(terminatedAmount),
                  },
                ]}
                activeValue={marketTab}
                onSelect={handleChangeMarketTab}
              />
            </Box>
          </DashboardSectionAccordion>
        )}

        <DashboardSectionAccordion
          label={t("dashboard.markets.tables.other.title")}
          amount={count(otherMarketsAmount)}
          open={marketSection === BorrowerMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(BorrowerMarketDashboardSections.OTHER)
          }
          hideIndicator
          compact
        >
          <Box sx={{ paddingLeft: "14px" }}>
            <DashboardSubItems
              items={[
                {
                  value: BorrowerMarketDashboardTabs.SELF_ONBOARD,
                  label: t("dashboard.markets.tables.other.selfOnboard"),
                  amount: count(selfOnboardAmount),
                },
                {
                  value: BorrowerMarketDashboardTabs.MANUAL,
                  label: t("dashboard.markets.tables.other.manual"),
                  amount: count(manualAmount),
                },
                {
                  value: BorrowerMarketDashboardTabs.OTHER_TERMINATED,
                  label: t("dashboard.markets.tables.other.terminated"),
                  amount: count(terminatedOtherAmount),
                },
              ]}
              activeValue={marketTab}
              onSelect={handleChangeMarketTab}
            />
          </Box>
        </DashboardSectionAccordion>
      </DashboardPageAccordion>

      {showFullFunctionality && (
        <DashboardPageAccordion
          label={t("borrowerMarketList.title.policies")}
          amount={policiesCount}
          open={section === BorrowerDashboardSections.POLICIES}
          onClick={() =>
            handleChangeSection(BorrowerDashboardSections.POLICIES)
          }
          hideAccordionButton
          compact
          icon={
            <SvgIcon sx={{ fontSize: "16px", marginRight: "10px" }}>
              <Policies />
            </SvgIcon>
          }
        />
      )}
    </Box>
  )
}
