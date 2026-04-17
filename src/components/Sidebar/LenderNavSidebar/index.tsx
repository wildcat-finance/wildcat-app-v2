"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import AllMarketsIcon from "@/assets/icons/markets_icon.svg"
import ExploreIcon from "@/assets/icons/oneOfMany_icon.svg"
import MyMarketsIcon from "@/assets/icons/stack_icon.svg"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setScrollTarget,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

import {
  DashboardButton,
  DashboardSectionAccordion,
} from "../DashboardSidebarComponents"

export const LenderNavSidebar = () => {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
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
  const allMarketsCount = useAppSelector(
    (state) => state.lenderDashboardAmounts.allMarkets,
  )

  const activeMarketsAmount = depositedAmount + nonDepositedAmount
  const closedMarketsAmount = prevActiveAmount + neverActiveAmount
  const myMarketsCount = activeMarketsAmount + closedMarketsAmount

  const isOnExplore = pathname === ROUTES.lender.explore
  const isOnMyMarkets = pathname === ROUTES.lender.myMarkets
  const isOnAllMarkets = pathname === ROUTES.lender.allMarkets

  const navLinkSx = (active: boolean) => ({
    width: "100%",
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    backgroundColor: active ? COLORS.whiteSmoke : "transparent",
    borderRadius: "8px",
    textDecoration: "none",
    transition: "background-color 0.1s ease-in-out",
    "&:hover": { backgroundColor: COLORS.whiteSmoke },
  })

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        padding: "20px 16px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ width: "100%", marginBottom: "4px" }}>
        <Box
          component={Link}
          href={ROUTES.lender.explore}
          sx={navLinkSx(isOnExplore)}
        >
          <SvgIcon sx={{ marginRight: "10px" }}>
            <ExploreIcon />
          </SvgIcon>
          <Typography variant="text2">Explore</Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", marginBottom: isOnMyMarkets ? "16px" : "4px" }}>
        <Box
          component={Link}
          href={ROUTES.lender.myMarkets}
          sx={navLinkSx(isOnMyMarkets)}
        >
          <SvgIcon sx={{ marginRight: "10px" }}>
            <MyMarketsIcon />
          </SvgIcon>
          <Typography variant="text2" sx={{ marginRight: "6px" }}>
            My Markets
          </Typography>
          <Typography variant="text2" color={COLORS.santasGrey}>
            {myMarketsCount !== 0 ? activeMarketsAmount : null}
          </Typography>
        </Box>

        {isOnMyMarkets && (
          <Box
            sx={{
              width: "100%",
              paddingLeft: "14px",
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <DashboardSectionAccordion
              label={t("dashboard.markets.tables.borrower.active.title")}
              amount={activeMarketsAmount}
              open={marketSection === LenderMarketDashboardSections.ACTIVE}
              onClick={() =>
                dispatch(setMarketSection(LenderMarketDashboardSections.ACTIVE))
              }
            >
              <DashboardButton
                label={t("dashboard.markets.tables.borrower.active.deposited")}
                amount={depositedAmount}
                onClick={() => dispatch(setScrollTarget("deposited"))}
              />
              <DashboardButton
                label={t(
                  "dashboard.markets.tables.borrower.active.nonDeposited",
                )}
                amount={nonDepositedAmount}
                onClick={() => dispatch(setScrollTarget("non-deposited"))}
              />
            </DashboardSectionAccordion>

            <DashboardSectionAccordion
              label={t("dashboard.markets.tables.borrower.closed.title")}
              amount={closedMarketsAmount}
              open={marketSection === LenderMarketDashboardSections.TERMINATED}
              onClick={() =>
                dispatch(
                  setMarketSection(LenderMarketDashboardSections.TERMINATED),
                )
              }
            >
              <DashboardButton
                label={t("dashboard.markets.tables.borrower.closed.prevActive")}
                amount={prevActiveAmount}
                onClick={() => dispatch(setScrollTarget("prev-active"))}
              />
              <DashboardButton
                label={t(
                  "dashboard.markets.tables.borrower.closed.neverActive",
                )}
                amount={neverActiveAmount}
                onClick={() => dispatch(setScrollTarget("never-active"))}
              />
            </DashboardSectionAccordion>
          </Box>
        )}
      </Box>

      <Box sx={{ width: "100%", marginBottom: "4px" }}>
        <Box
          component={Link}
          href={ROUTES.lender.allMarkets}
          sx={navLinkSx(isOnAllMarkets)}
        >
          <SvgIcon sx={{ marginRight: "10px" }}>
            <AllMarketsIcon />
          </SvgIcon>
          <Typography variant="text2" sx={{ marginRight: "6px" }}>
            All Markets
          </Typography>
          <Typography variant="text2" color={COLORS.santasGrey}>
            {allMarketsCount !== 0 ? allMarketsCount : null}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
