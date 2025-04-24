"use client"

import { useState, useEffect } from "react"

import CloseIcon from "@mui/icons-material/Close"
import MenuIcon from "@mui/icons-material/Menu"
import { Box, IconButton } from "@mui/material"
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

interface SidebarProps {
  visible?: boolean
  onVisibilityChange?: (visible: boolean) => void
}

export const Sidebar = ({
  visible = true,
  onVisibilityChange,
}: SidebarProps) => {
  const pathname = usePathname()
  const step = useAppSelector((state) => state.borrowerOverview.tab)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const showCommitHash =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  const toggleSidebar = () => {
    setIsMobileOpen(!isMobileOpen)
    if (onVisibilityChange && !isMobile) {
      onVisibilityChange(!visible)
    }
  }

  const closeSidebar = () => {
    setIsMobileOpen(false)
    if (onVisibilityChange && !isMobile) {
      onVisibilityChange(false)
    }
  }
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    
    // Add event listener for toggling sidebar from other components
    const handleToggleSidebar = () => {
      toggleSidebar()
    }
    document.addEventListener("toggle-sidebar", handleToggleSidebar)
    
    return () => {
      window.removeEventListener("resize", checkIfMobile)
      document.removeEventListener("toggle-sidebar", handleToggleSidebar)
    }
  }, [toggleSidebar]);

  return (
    <>
      {isMobile && (
        <IconButton
          onClick={toggleSidebar}
          sx={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 99,
            backgroundColor: COLORS.white,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
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
          position: isMobile ? "fixed" : "relative",
          left: isMobile ? (isMobileOpen ? 0 : "-100%") : 0,
          top: isMobile ? 0 : "auto",
          zIndex: 1000,
          backgroundColor: COLORS.white,
          width: isMobile ? "80%" : "267px",
          maxWidth: isMobile ? "300px" : "267px",
          minWidth: isMobile ? "0" : (visible ? "267px" : "0"),
          flexShrink: 0,
          flexBasis: visible ? "267px" : "0",
          transition: "left 0.3s ease-in-out, min-width 0.3s ease-in-out, flex-basis 0.3s ease-in-out",
          boxShadow: isMobile ? "0 0 10px rgba(0,0,0,0.2)" : "none",
          paddingTop: isMobile ? "60px" : 0,
          display: isMobile ? "block" : (visible ? "block" : "none")
        }}
      >
        {isMobile && (
          <IconButton
            onClick={closeSidebar}
            sx={{
              position: "absolute",
              top: "16px",
              right: "16px",
              zIndex: 99
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        
        <Box
          sx={{
            height: `calc(100% - ${showCommitHash ? "130px" : "88px"})`
          }}
        >
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
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 999
          }}
        />
      )}
    </>
  )
}
