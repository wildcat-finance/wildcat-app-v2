"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import AllMarketsIcon from "@/assets/icons/allMarkets_icon.svg"
import ExploreIcon from "@/assets/icons/oneOfMany_icon.svg"
import MyMarketsIcon from "@/assets/icons/stack_icon.svg"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderAllMarketsTab,
  LenderMyMarketsTab,
  setAllMarketsTab,
  setMyMarketsTab,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

import { DashboardSubItems } from "../DashboardSidebarComponents"

export const LenderNavSidebar = () => {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const { isConnected } = useAccount()

  const myMarketsTab = useAppSelector(
    (state) => state.lenderDashboard.myMarketsTab,
  )
  const allMarketsTab = useAppSelector(
    (state) => state.lenderDashboard.allMarketsTab,
  )

  const depositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.deposited,
  )
  const nonDepositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.nonDeposited,
  )
  const prevActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.prevActive,
  )
  const neverActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.neverActive,
  )
  const selfOnboardAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.selfOnboard,
  )
  const manualAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.manual,
  )
  const terminatedOtherAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.terminatedOther,
  )
  const defaultedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.defaulted,
  )
  const defaultedOtherAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.defaultedOther,
  )
  const { isLoading: isDefaultsLoading, isError: isDefaultsError } =
    useDefaultedMarkets()

  const closedMarketsAmount = prevActiveAmount + neverActiveAmount
  const myMarketsCount =
    depositedAmount + nonDepositedAmount + closedMarketsAmount + defaultedAmount
  const allMarketsCount =
    selfOnboardAmount +
    manualAmount +
    terminatedOtherAmount +
    defaultedOtherAmount

  const countsReady = myMarketsCount + allMarketsCount > 0
  const count = (amount: number) => (countsReady ? amount : undefined)
  const defaultedCount = (amount: number) =>
    isDefaultsLoading || isDefaultsError ? undefined : count(amount)

  const isOnExplore = pathname === ROUTES.lender.explore
  const isOnMyMarkets = pathname === ROUTES.lender.myMarkets
  const isOnAllMarkets = pathname === ROUTES.lender.allMarkets

  const navLinkSx = (active: boolean) => ({
    width: "100%",
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    backgroundColor: active ? COLORS.whiteSmoke : "transparent",
    borderRadius: "10px",
    textDecoration: "none",
    transition: "background-color 0.1s ease-in-out",
    "&:hover": { backgroundColor: COLORS.whiteSmoke },
  })

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        padding: "24px 16px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ width: "100%", marginBottom: "8px" }}>
        <Box
          component={Link}
          href={ROUTES.lender.explore}
          sx={navLinkSx(isOnExplore)}
        >
          <SvgIcon sx={{ marginRight: "6px" }}>
            <ExploreIcon />
          </SvgIcon>
          <Typography variant="text2">Explore</Typography>
        </Box>
      </Box>

      {isConnected && (
        <Box sx={{ width: "100%", marginBottom: "8px" }}>
          <Box
            component={Link}
            href={ROUTES.lender.myMarkets}
            sx={navLinkSx(isOnMyMarkets)}
          >
            <SvgIcon sx={{ marginRight: "6px" }}>
              <MyMarketsIcon />
            </SvgIcon>
            <Typography variant="text2" sx={{ marginRight: "6px" }}>
              My Markets
            </Typography>
            <Typography variant="text2" color={COLORS.santasGrey}>
              {count(myMarketsCount)}
            </Typography>
          </Box>

          {isOnMyMarkets && (
            <Box sx={{ marginTop: "8px", paddingLeft: "34px" }}>
              <DashboardSubItems
                activeValue={myMarketsTab}
                onSelect={(tab) => dispatch(setMyMarketsTab(tab))}
                items={[
                  {
                    value: LenderMyMarketsTab.DEPOSITED,
                    label: t(
                      "dashboard.markets.tables.borrower.active.deposited",
                    ),
                    amount: count(depositedAmount),
                  },
                  {
                    value: LenderMyMarketsTab.NON_DEPOSITED,
                    label: t(
                      "dashboard.markets.tables.borrower.active.nonDeposited",
                    ),
                    amount: count(nonDepositedAmount),
                  },
                  {
                    value: LenderMyMarketsTab.TERMINATED,
                    label: t("dashboard.markets.tables.other.terminated"),
                    amount: count(closedMarketsAmount),
                  },
                  {
                    value: LenderMyMarketsTab.DEFAULTED,
                    label: t("defaultedMarkets.tab"),
                    amount: defaultedCount(defaultedAmount),
                  },
                ]}
              />
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ width: "100%", marginBottom: "8px" }}>
        <Box
          component={Link}
          href={ROUTES.lender.allMarkets}
          sx={navLinkSx(isOnAllMarkets)}
        >
          <SvgIcon sx={{ marginRight: "6px" }}>
            <AllMarketsIcon />
          </SvgIcon>
          <Typography variant="text2" sx={{ marginRight: "6px" }}>
            All Markets
          </Typography>
          <Typography variant="text2" color={COLORS.santasGrey}>
            {count(allMarketsCount)}
          </Typography>
        </Box>

        {isOnAllMarkets && (
          <Box sx={{ marginTop: "8px", paddingLeft: "34px" }}>
            <DashboardSubItems
              activeValue={allMarketsTab}
              onSelect={(tab) => dispatch(setAllMarketsTab(tab))}
              items={[
                {
                  value: LenderAllMarketsTab.SELF_ONBOARD,
                  label: t("dashboard.markets.tables.other.selfOnboard"),
                  amount: count(selfOnboardAmount),
                },
                {
                  value: LenderAllMarketsTab.MANUAL,
                  label: t("dashboard.markets.tables.other.manual"),
                  amount: count(manualAmount),
                },
                {
                  value: LenderAllMarketsTab.TERMINATED,
                  label: t("dashboard.markets.tables.other.terminated"),
                  amount: count(terminatedOtherAmount),
                },
                {
                  value: LenderAllMarketsTab.DEFAULTED,
                  label: t("defaultedMarkets.tab"),
                  amount: defaultedCount(defaultedOtherAmount),
                },
              ]}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
