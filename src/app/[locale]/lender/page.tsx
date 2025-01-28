"use client"

import React from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MarketsSection } from "@/app/[locale]/lender/components/MarketsSection"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export default function Lender() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const showConnectedData = isConnected && !isWrongNetwork

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
