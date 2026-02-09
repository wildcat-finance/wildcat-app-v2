import React from "react"

import { Box, Divider, Skeleton } from "@mui/material"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

export const WrapperSkeleton = () => {
  const isMobile = useMobileResolution()
  const isMobileOpenState = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  return (
    <Box
      sx={{
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : "0",
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "16px" : "0",
      }}
    >
      {isMobileOpenState && isMobile && (
        <Divider sx={{ marginBottom: "26px" }} />
      )}

      {!isMobile && (
        <Skeleton
          sx={{ width: "110px", height: "20px", marginBottom: "6px" }}
        />
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobileOpenState ? "center" : "flex-start",
          gap: isMobile ? "6px" : "11px",
          marginBottom: "12px",
          marginTop: isMobileOpenState && isMobile ? "26px" : "0px",
        }}
      >
        <Skeleton sx={{ width: "185px", height: "32px" }} />

        <Skeleton
          sx={{
            width: "55px",
            height: "24px",
            borderRadius: "26px",
          }}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: isMobile && isMobileOpenState ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isMobile && !isMobileOpenState ? "12px" : "0",
        }}
      >
        <Skeleton
          sx={{
            width: isMobile ? "100%" : "167px",
            height: isMobile ? "32px" : "28px",
            borderRadius: isMobile ? "28px" : "8px",
          }}
        />

        {isMobileOpenState && (
          <Box
            sx={{
              display: "flex",
              gap: "6px",
              marginTop: isMobile && isMobileOpenState ? "20px" : 0,
            }}
          >
            <Skeleton sx={{ width: "129px", height: "28px" }} />

            <Skeleton sx={{ width: "129px", height: "28px" }} />
          </Box>
        )}
      </Box>

      {isMobileOpenState && (
        <Divider
          sx={{
            margin: isMobile ? "20px 16px" : "24px 0 20px",
          }}
        />
      )}

      <Skeleton sx={{ width: "100%", height: "88px", borderRadius: "12px" }} />
    </Box>
  )
}
