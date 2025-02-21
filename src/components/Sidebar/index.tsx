"use client"

import { Box } from "@mui/material"
import { usePathname } from "next/navigation"

import { Footer } from "@/components/Footer"
import { BorrowerDashboardSidebar } from "@/components/Sidebar/BorrowerDashboardSidebar"
import { BorrowerSidebar } from "@/components/Sidebar/BorrowerSidebar"
import { CreateMarketSidebar } from "@/components/Sidebar/CreateMarketSidebar"
import { EditProfileSidebar } from "@/components/Sidebar/EditProfileSidebar"
import { LenderDashboardSidebar } from "@/components/Sidebar/LenderDashboardSidebar"
import { LenderMarketSidebar } from "@/components/Sidebar/LenderMarketSidebar"
import { LenderListSidebar } from "@/components/Sidebar/LendersListSidebar"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"
import { NewMarketSidebar } from "@/components/Sidebar/NewMarketSidebar"
import { NotificationsSidebar } from "@/components/Sidebar/NotificationsSidebar"
import { LendersTabSidebar } from "@/components/Sidebar/OverviewSidebars/LendersTabSidebar"
import { MarketsTabSidebar } from "@/components/Sidebar/OverviewSidebars/MarketsTabSidebar"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"
import { COLORS } from "@/theme/colors"

import { EditPolicySidebar } from "./EditPolicySidebar"

export const Sidebar = () => {
  const pathname = usePathname()
  const step = useAppSelector((state) => state.borrowerOverview.tab)

  const showCommitHash =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  return (
    <Box
      sx={{
        height: "calc(100vh - 82px)",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        overflow: "hidden",
        overflowY: "auto",
      }}
    >
      <Box sx={{ height: `calc(100% - ${showCommitHash ? "130px" : "88px"})` }}>
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

      <Footer />
    </Box>
  )
}
