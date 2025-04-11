import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useSwitchChain } from "wagmi"

import { TargetChainId, TargetNetwork } from "@/config/network"

import { AlertContainer, ButtonStyle, PageContainer } from "./style"

export const WrongNetworkAlert = () => {
  const { t } = useTranslation()
  const { switchChain } = useSwitchChain()

  const handleSwitchChain = () => {
    switchChain({ chainId: TargetChainId })
  }

  return (
    <Box sx={PageContainer}>
      <Box sx={AlertContainer}>
        <Typography variant="text1" sx={{ marginBottom: "6px" }}>
          {t("dashboard.markets.noMarkets.wrongNetwork")}
        </Typography>

        <Typography
          variant="text3"
          color="#8A8C9F"
          sx={{ marginBottom: "24px" }}
        >
          Switch to {TargetChainId === 1 ? "Ethereum" : "Sepolia"} to explore
          the markets.
        </Typography>

        <Button
          size="small"
          variant="contained"
          sx={ButtonStyle}
          onClick={handleSwitchChain}
        >
          Switch to {TargetChainId === 1 ? "Ethereum" : "Sepolia"}
        </Button>
      </Box>
    </Box>
  )
}
