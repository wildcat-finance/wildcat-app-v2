"use client"

import { Box } from "@mui/material"
import { usePathname } from "next/navigation"

import { AllMarketsSidebar } from "@/components/Sidebar/AllMarketsSidebar"
import { LenderListSidebar } from "@/components/Sidebar/LendersListSidebar"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"
import { NewMarketSidebar } from "@/components/Sidebar/NewMarketSidebar"
import { ROUTES } from "@/routes"

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 60px);",
        overflow: "hidden",
        overflowY: "auto",
      }}
    >
      {pathname === ROUTES.borrower.root && <AllMarketsSidebar />}
      {pathname.includes(ROUTES.borrower.market) && <MarketSidebar />}
      {pathname === ROUTES.borrower.newMarket && <NewMarketSidebar />}
      {pathname === ROUTES.borrower.lendersList && <LenderListSidebar />}
    </Box>
  )
}
