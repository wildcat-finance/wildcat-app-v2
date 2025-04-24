"use client"

import { useState, useEffect } from "react"
import { Box, useMediaQuery, Theme } from "@mui/material"

import {
  BackgroundContainer,
  ContentContainer,
  PageContainer,
} from "@/app/[locale]/layout-style"
import Header from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"))
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile)

  useEffect(() => {
    setSidebarVisible(!isMobile)
  }, [isMobile])

  return (
    <>
      <Box sx={BackgroundContainer} />
      <Box position="relative" zIndex="1">
        <Header />
        <Box sx={PageContainer}>
          <Box sx={ContentContainer}>
            {/* Sidebar */}
            <Sidebar 
              visible={sidebarVisible}
              onVisibilityChange={setSidebarVisible}
            />
            
            {/* Main Content */}
            <Box 
              sx={{ 
                width: sidebarVisible ? "calc(100% - 267px)" : "100%",
                flexGrow: 1,
                transition: "width 0.3s ease-in-out",
              }}
            >
              {children}
            </Box>
          </Box>
          {/* <Footer /> */}
        </Box>
      </Box>
    </>
  )
}
