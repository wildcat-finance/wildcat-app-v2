"use client"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import {
  MobilePillTabItem,
  MobilePillTabs,
} from "@/components/Mobile/MobilePillTabs"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderAllMarketsTab,
  LenderMyMarketsTab,
  setAllMarketsTab,
  setMyMarketsTab,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

export type LenderMarketsMobileHeaderProps = {
  page: "yours" | "others"
}

export const LenderMarketsMobileHeader = ({
  page,
}: LenderMarketsMobileHeaderProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { isConnected, isReconnecting } = useAccount()
  const { isLoadingInitial } = useLenderMarketsContext()

  const allMarketsTab = useAppSelector(
    (state) => state.lenderDashboard.allMarketsTab,
  )
  const myMarketsTab = useAppSelector(
    (state) => state.lenderDashboard.myMarketsTab,
  )
  const {
    deposited,
    nonDeposited,
    prevActive,
    neverActive,
    selfOnboard,
    manual,
    terminatedOther,
  } = useAppSelector((state) => state.lenderDashboardAmounts)

  const terminatedMine = prevActive + neverActive

  const showPageSwitch = isConnected || isReconnecting || page === "yours"

  const pageItems: MobilePillTabItem[] = [
    {
      value: "yours",
      label: t("dashboard.markets.switcher.yours"),
      count: deposited + nonDeposited + terminatedMine,
      href: ROUTES.lender.myMarkets,
    },
    {
      value: "others",
      label: t("dashboard.markets.switcher.others"),
      count: selfOnboard + manual + terminatedOther,
      href: ROUTES.lender.allMarkets,
    },
  ]

  const tabItems: MobilePillTabItem[] =
    page === "yours"
      ? [
          {
            value: LenderMyMarketsTab.DEPOSITED,
            label: t("dashboard.markets.tables.borrower.active.deposited"),
            count: deposited,
          },
          {
            value: LenderMyMarketsTab.NON_DEPOSITED,
            label: t("dashboard.markets.tables.borrower.active.nonDeposited"),
            count: nonDeposited,
          },
          {
            value: LenderMyMarketsTab.TERMINATED,
            label: t("dashboard.markets.tables.other.terminated"),
            count: terminatedMine,
          },
        ]
      : [
          {
            value: LenderAllMarketsTab.SELF_ONBOARD,
            label: t("dashboard.markets.tables.other.selfOnboard"),
            count: selfOnboard,
          },
          {
            value: LenderAllMarketsTab.MANUAL,
            label: t("dashboard.markets.tables.other.manual"),
            count: manual,
          },
          {
            value: LenderAllMarketsTab.TERMINATED,
            label: t("dashboard.markets.tables.other.terminated"),
            count: terminatedOther,
          },
        ]

  const handleTabChange = (value: string) => {
    if (page === "yours") {
      dispatch(setMyMarketsTab(value as LenderMyMarketsTab))
    } else {
      dispatch(setAllMarketsTab(value as LenderAllMarketsTab))
    }
  }

  return (
    <Box
      sx={{
        width: "100%",
        padding: "8px",
        borderRadius: "14px",
        backgroundColor: COLORS.white,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ padding: "8px 0 8px 8px" }}>
        <Typography variant="mobH3" sx={{ letterSpacing: "-0.36px" }}>
          {t("dashboard.markets.title")}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {showPageSwitch && (
          <>
            <MobilePillTabs
              tone="neutral"
              items={pageItems}
              value={page}
              hideCounts={isLoadingInitial}
              ariaLabel={t("dashboard.markets.title")}
            />
            <Divider sx={{ mx: "4px", borderColor: COLORS.whiteLilac }} />
          </>
        )}

        <MobilePillTabs
          tone="accent"
          items={tabItems}
          value={page === "yours" ? myMarketsTab : allMarketsTab}
          onChange={handleTabChange}
          hideCounts={isLoadingInitial}
          ariaLabel={t("dashboard.markets.mobileList.sections")}
        />
      </Box>
    </Box>
  )
}
