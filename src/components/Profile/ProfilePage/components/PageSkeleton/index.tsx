"use client"

import { Box, Skeleton } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

import { ProfilePageSkeletonProps } from "./interface"

const blockSx = {
  borderRadius: "16px",
  transform: "none" as const,
}

const mobileBlockSx = {
  borderRadius: "14px",
  transform: "none" as const,
  backgroundColor: COLORS.white06,
}

const MobileProfilePageSkeleton = () => (
  <Box
    sx={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}
  >
    <Skeleton sx={{ ...mobileBlockSx, height: "200px" }} />
    <Skeleton sx={{ ...mobileBlockSx, height: "320px" }} />
    <Skeleton sx={{ ...mobileBlockSx, height: "200px" }} />
  </Box>
)

export const ProfilePageSkeleton = ({ isMobile }: ProfilePageSkeletonProps) =>
  isMobile ? (
    <MobileProfilePageSkeleton />
  ) : (
    <Box
      sx={{
        width: "100%",
        height: `calc(100vh - ${pageCalcHeights.page})`,
        overflowY: "auto",
        padding: "44px 44px 24px 44px",
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
