"use client"

import React, { useState } from "react"

import { Box, Tab, Tabs, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MarketsTab } from "@/app/[locale]/lender/components/MarketsTab"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export default function Lender() {
  const { t } = useTranslation()
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
            <Tab value="markets" label={t("lenderMarketList.allMarkets")} />
            <Tab value="mla" label={t("lenderMarketList.mla")} />
          </Tabs>
        ) : (
          <Typography variant="title2">
            {t("lenderMarketList.allMarkets")}
          </Typography>
        )}
      </Box>

      {tab === "markets" && (
        <MarketsTab showConnectedData={showConnectedData} />
      )}
      {tab === "mla" && <Box />}
    </Box>
  )
}
