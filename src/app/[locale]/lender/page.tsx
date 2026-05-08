"use client"

import { Box } from "@mui/material"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"
import { Footer } from "@/components/Footer"

export default function Lender() {
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        paddingTop: { xs: "0px", md: "32px" },
      }}
    >
      <Box
        sx={{
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MarketsSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
