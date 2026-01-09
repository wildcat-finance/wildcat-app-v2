"use client"

import { Box, useTheme } from "@mui/material"
import { usePathname } from "next/navigation"

import { Footer } from "@/components/Footer"
import { BorrowerDashboardSidebar } from "@/components/Sidebar/BorrowerDashboardSidebar"
import { BorrowerSidebar } from "@/components/Sidebar/BorrowerSidebar"
import { CreateMarketSidebar } from "@/components/Sidebar/CreateMarketSidebar"
import { LenderDashboardSidebar } from "@/components/Sidebar/LenderDashboardSidebar"
import { LenderMarketSidebar } from "@/components/Sidebar/LenderMarketSidebar"
import { LenderListSidebar } from "@/components/Sidebar/LendersListSidebar"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { EditPolicySidebar } from "./EditPolicySidebar"
import { TelegramBanner } from "../TelegramBanner"

export const Sidebar = () => {
  const pathname = usePathname()
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 82px)",
        minWidth: "267px",
        width: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        overflow: "hidden",
        overflowY: "auto",
        [theme.breakpoints.down("md")]: {
          display: "none",
        },
      }}
    >
      <Box marginBottom="auto">
        {pathname === ROUTES.lender.root && <LenderDashboardSidebar />}
        {pathname === ROUTES.borrower.root && <BorrowerDashboardSidebar />}
        {pathname.includes(ROUTES.borrower.market) && <MarketSidebar />}
        {(pathname.includes(ROUTES.borrower.profile) ||
          pathname.includes(ROUTES.lender.profile)) && <BorrowerSidebar />}
        {/* {pathname.includes(ROUTES.borrower.profile) && <BorrowerSidebar />} */}
        {pathname.includes(ROUTES.lender.market) && <LenderMarketSidebar />}
        {pathname === ROUTES.borrower.createMarket && <CreateMarketSidebar />}
        {pathname === ROUTES.borrower.lendersList && <LenderListSidebar />}
        {pathname === ROUTES.borrower.policy && <EditPolicySidebar />}
        {/* {pathname === ROUTES.borrower.notifications && <NotificationsSidebar />} */}
      </Box>

      <Box sx={{ width: "100%", marginTop: "auto" }}>
        <TelegramBanner />

        <Footer />
      </Box>
    </Box>
  )
}
