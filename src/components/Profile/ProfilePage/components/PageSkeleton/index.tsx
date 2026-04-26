"use client"

import { Box, Skeleton } from "@mui/material"

import { pageCalcHeights } from "@/utils/constants"

import { ProfilePageSkeletonProps } from "./interface"

const blockSx = {
  borderRadius: "16px",
  transform: "none" as const,
}

export const ProfilePageSkeleton = ({ isMobile }: ProfilePageSkeletonProps) => (
  <Box
    sx={{
      width: "100%",
      height: isMobile ? "auto" : `calc(100vh - ${pageCalcHeights.page})`,
      overflowY: isMobile ? "visible" : "auto",
      padding: isMobile ? "0" : "44px 44px 24px 44px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    }}
  >
    <Skeleton sx={{ ...blockSx, height: "200px" }} />

    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Skeleton sx={{ width: "180px", height: "20px" }} />
      <Skeleton sx={{ ...blockSx, height: "320px" }} />
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Skeleton sx={{ width: "200px", height: "20px" }} />
      <Skeleton sx={{ ...blockSx, height: "200px" }} />
    </Box>
  </Box>
)
