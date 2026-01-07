import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useSwitchChain } from "wagmi"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { AlertContainer, ButtonStyle, PageContainer } from "./style"

export type WrongNetworkAlertType = {
  title?: string
  description?: string
  padding?: string
}

export const WrongNetworkAlert = ({
  title,
  description,
  padding,
}: WrongNetworkAlertType) => {
  const { t } = useTranslation()
  const { switchChain } = useSwitchChain()
  const { chainId, name } = useSelectedNetwork()

  const handleSwitchChain = () => {
    switchChain({ chainId })
  }

  return (
    <Box
      sx={{
        ...PageContainer,
        padding: padding ?? { xs: "4px 0 0", md: "24px 24px 0 24px" },
      }}
    >
      <Box sx={AlertContainer}>
        <Typography variant="text1" sx={{ marginBottom: "6px" }}>
          {title ?? t("dashboard.markets.noMarkets.wrongNetwork")}
        </Typography>

        <Typography
          variant="text3"
          color="#8A8C9F"
          sx={{ marginBottom: "24px" }}
        >
          {description ?? `Switch to ${name} to explore the markets.`}
        </Typography>

        <Button
          size="small"
          variant="contained"
          sx={ButtonStyle}
          onClick={handleSwitchChain}
        >
          Switch Network
        </Button>
      </Box>
    </Box>
  )
}
