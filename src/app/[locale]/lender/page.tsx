"use client"

import React, { useState } from "react"

import { Box, Tab, Tabs, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { MarketsTab } from "@/app/[locale]/lender/components/MarketsTab"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export default function Lender() {
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const [tab, setTab] = useState<"markets" | "mla">("markets")

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: "markets" | "mla",
  ) => {
    setTab(newTab)
  }

  const showConnectedData = isConnected && !isWrongNetwork

  return (
    <Box sx={{ height: "calc(100vh - 43px - 43px - 52px)", overflow: "auto" }}>
      <Box
        sx={{
          width: "100%",
          padding: "42px 16px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          marginBottom: "32px",
        }}
      >
        {showConnectedData ? (
          <Tabs
            value={tab}
            onChange={handleTabsChange}
            aria-label="Lender overview tabs"
          >
            <Tab value="markets" label="All markets" />
            <Tab value="mla" label="MLA" />
          </Tabs>
        ) : (
          <Typography variant="title2">All markets</Typography>
        )}
      </Box>

      {tab === "markets" && (
        <MarketsTab showConnectedData={showConnectedData} />
      )}
      {tab === "mla" && <Box />}
    </Box>
  )
}
