"use client"

import { useState, useEffect } from "react"

import { Box, IconButton } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
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
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const showCommitHash =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  const toggleSidebar = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  const closeSidebar = () => {
    setIsMobileOpen(false)
  }

  return (
    <>
      {isMobile && (
        <IconButton 
          onClick={toggleSidebar} 
          sx={{ 
            position: 'fixed', 
            top: '16px', 
            left: '16px', 
            zIndex: 99, 
            backgroundColor: COLORS.white,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      
      <Box
        sx={{
          height: "calc(100vh - 82px)",
          borderRight: `1px solid ${COLORS.blackRock006}`,
          overflow: "hidden",
          overflowY: "auto",
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (isMobileOpen ? 0 : '-100%') : 0,
          top: isMobile ? 0 : 'auto',
          zIndex: 1000,
          backgroundColor: COLORS.white,
          width: isMobile ? '80%' : 'auto',
          maxWidth: isMobile ? '300px' : 'none',
          transition: 'left 0.3s ease-in-out',
          boxShadow: isMobile ? '0 0 10px rgba(0,0,0,0.2)' : 'none',
          paddingTop: isMobile ? '60px' : 0,
        }}
      >
        {isMobile && (
          <IconButton 
            onClick={closeSidebar} 
            sx={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              zIndex: 99 
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        
        <Box sx={{ height: `calc(100% - ${showCommitHash ? "130px" : "88px"})` }}>
          {pathname === ROUTES.lender.root && <LenderDashboardSidebar />}
          {pathname === ROUTES.borrower.root && <BorrowerDashboardSidebar />}
          {pathname.includes(ROUTES.borrower.market) && <MarketSidebar />}
          {(pathname.includes(ROUTES.borrower.profile) ||
            pathname.includes(ROUTES.lender.profile)) && <BorrowerSidebar />}
          {pathname.includes(ROUTES.lender.market) && <LenderMarketSidebar />}
          {pathname === ROUTES.borrower.createMarket && <CreateMarketSidebar />}
          {pathname === ROUTES.borrower.lendersList && <LenderListSidebar />}
          {pathname === ROUTES.borrower.policy && <EditPolicySidebar />}
        </Box>

        <Footer />
      </Box>
      
      {isMobile && isMobileOpen && (
        <Box 
          onClick={closeSidebar}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
        />
      )}
    </>
  )
}
