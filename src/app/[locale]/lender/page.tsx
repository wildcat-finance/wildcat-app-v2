"use client"

import React from "react"

import { Box, useMediaQuery } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export default function Lender() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const isMobile = useMediaQuery("(max-width:768px)")

  const showConnectedData = isConnected && !isWrongNetwork

  return (
    <Box
      sx={{
        padding: isMobile ? "32px 0 0" : "32px 0 0",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <MarketsSection />
    </Box>
  )
}
