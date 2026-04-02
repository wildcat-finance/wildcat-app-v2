import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useSwitchChain } from "wagmi"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { AlertContainer, ButtonStyle, PageContainer } from "./style"

export const WrongNetworkAlert = () => {
  const { t } = useTranslation()
  const { switchChain } = useSwitchChain()
  const { chainId, name } = useSelectedNetwork()

  const handleSwitchChain = () => {
    switchChain({ chainId })
  }

  return (
    <Box sx={PageContainer}>
      <Box sx={AlertContainer}>
        <Typography variant="text1" sx={{ marginBottom: "6px" }}>
          {t("dashboard.emptyStates.wrongNetwork")}
        </Typography>

        <Typography
          variant="text3"
          color="#8A8C9F"
          sx={{ marginBottom: "24px" }}
        >
          {t("common.wrongNetworkAlert.switchTo", { name })}
        </Typography>

        <Button
          size="small"
          variant="contained"
          sx={ButtonStyle}
          onClick={handleSwitchChain}
        >
          {t("common.wrongNetworkAlert.switchNetwork")}
        </Button>
      </Box>
    </Box>
  )
}
