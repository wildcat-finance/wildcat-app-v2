"use client"

import { Box } from "@mui/material"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"
import { Footer } from "@/components/Footer"

export default function Lender() {
  return (
    <Box
      sx={{
        minHeight: { xs: "calc(100dvh - 64px)", md: "auto" },
        display: "flex",
        flexDirection: "column",
        paddingTop: { xs: "0px", md: "32px" },
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <MarketsSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
