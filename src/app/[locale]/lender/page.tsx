"use client"

import React from "react"

import { Box } from "@mui/material"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"

export default function Lender() {
  return (
    <Box
      sx={{
        padding: "32px 0 0",
        overflow: "hidden",
      }}
    >
      <MarketsSection />
    </Box>
  )
}
