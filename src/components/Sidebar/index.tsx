"use client"

import { Box } from "@mui/material"
import { usePathname } from "next/navigation"

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

  return (
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 60px);",
        overflow: "hidden",
        overflowY: "auto",
      }}
    >
      {(pathname === ROUTES.borrower.root || pathname === ROUTES.lender.root) &&
        step === BorrowerOverviewTabs.MARKETS && <MarketsTabSidebar />}
      {pathname === ROUTES.borrower.root &&
        step === BorrowerOverviewTabs.MLA && (
          <Box
            sx={{
              height: "100%",
              width: "267px",
              borderRight: `1px solid ${COLORS.blackRock006}`,
            }}
          />
        )}
      {pathname === ROUTES.borrower.root &&
        step === BorrowerOverviewTabs.LENDERS && <LendersTabSidebar />}
      {pathname === ROUTES.borrower.root &&
        step === BorrowerOverviewTabs.POLICIES && (
          <Box
            sx={{
              height: "100%",
              width: "267px",
              borderRight: `1px solid ${COLORS.blackRock006}`,
            }}
          />
        )}
      {pathname.includes(ROUTES.borrower.market) && <MarketSidebar />}
      {pathname.includes(ROUTES.lender.market) && <LenderMarketSidebar />}
      {pathname === ROUTES.borrower.newMarket && <NewMarketSidebar />}
      {pathname === ROUTES.borrower.lendersList && <LenderListSidebar />}
      {pathname === ROUTES.borrower.editPolicy && <EditPolicySidebar />}
      {pathname === ROUTES.borrower.notifications && <NotificationsSidebar />}
    </Box>
  )
}
