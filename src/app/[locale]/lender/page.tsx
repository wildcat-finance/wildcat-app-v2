"use client"

import React from "react"

import { Box } from "@mui/material"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"

export default function Lender() {
  return (
    <Box
      sx={{
        paddingTop: { xs: "0px", sm: "32px" },
        overflow: "hidden",
      }}
    >
      <MarketsSection />
    </Box>
  )
}
