"use client"

import { Box } from "@mui/material"
import { usePathname } from "next/navigation"

import { AllMarketsSidebar } from "@/components/Sidebar/AllMarketsSidebar"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"
import { NewMarketSidebar } from "@/components/Sidebar/NewMarketSidebar"
import { ROUTES } from "@/routes"

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <Box>
      {pathname === ROUTES.borrower.root && <AllMarketsSidebar />}
      {pathname === ROUTES.borrower.market && <MarketSidebar />}
      {pathname === ROUTES.borrower.newMarket && <NewMarketSidebar />}
    </Box>
  )
}
