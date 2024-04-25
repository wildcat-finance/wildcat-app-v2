"use client"

import { AllMarketsSidebar } from "@/components/Sidebar/AllMarketsSidebar"
import { usePathname } from "next/navigation"
import { Box } from "@mui/material"
import { ROUTES } from "@/routes"
import { MarketSidebar } from "@/components/Sidebar/MarketSidebar"

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <Box>
      {pathname === ROUTES.borrower.root && <AllMarketsSidebar />}
      {pathname === ROUTES.borrower.market && <MarketSidebar />}
    </Box>
  )
}
