"use client"

import { Box } from "@mui/material"
import { usePathname } from "next/navigation"

import { AllMarketsSidebar } from "@/components/Sidebar/AllMarketsSidebar"
import { LendersTabSidebar } from "@/components/Sidebar/BorrowerOverviewSidebars/LendersTabSidebar"
import { LenderListSidebar } from "@/components/Sidebar/LendersListSidebar"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"
import { NewMarketSidebar } from "@/components/Sidebar/NewMarketSidebar"
import { NotificationsSidebar } from "@/components/Sidebar/NotificationsSidebar"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"
import { COLORS } from "@/theme/colors"

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
      {pathname === ROUTES.borrower.root &&
        step === BorrowerOverviewTabs.MARKETS && <AllMarketsSidebar />}
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
      {pathname.includes(ROUTES.borrower.market) && <MarketSidebar />}
      {pathname === ROUTES.borrower.newMarket && <NewMarketSidebar />}
      {pathname === ROUTES.borrower.lendersList && <LenderListSidebar />}
      {pathname === ROUTES.borrower.notifications && <NotificationsSidebar />}
    </Box>
  )
}
