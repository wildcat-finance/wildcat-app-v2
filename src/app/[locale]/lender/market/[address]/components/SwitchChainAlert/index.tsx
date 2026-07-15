import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { Trans, useTranslation } from "react-i18next"

import { NETWORKS } from "@/config/network"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { COLORS } from "@/theme/colors"

import { SwitchChainAlertProps } from "./interface"
import {
  AlertContainer,
  ButtonStyle,
  PageContainer,
  TypoContainer,
} from "./style"

const PrimaryNetworks = Object.values(NETWORKS)

export const SwitchChainAlert = ({ desiredChainId }: SwitchChainAlertProps) => {
  const { t } = useTranslation()
  const { requestSwitchNetwork, isSwitching } = useNetworkGate({
    desiredChainId,
    includeAgreementStatus: false,
  })

  const isMobile = useMobileResolution()

  const desiredChainName =
    PrimaryNetworks.find((chain) => chain.chainId === desiredChainId)?.name ??
    t("marketDetails.lender.switchChain.unknownNetwork")

  const handleSwitchChain = () => {
    requestSwitchNetwork()
  }

  if (isMobile)
    return (
      <>
        <Typography
          variant="mobH3"
          color={COLORS.white}
          textAlign="center"
          marginTop="12px"
        >
          {t("marketDetails.lender.switchChain.title")}
        </Typography>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <Typography
            variant="mobText3"
            color={COLORS.white06}
            textAlign="center"
          >
            <Trans
              i18nKey="marketDetails.lender.switchChain.description"
              values={{ chainName: desiredChainName }}
              components={{
                break: <br />,
                emphasis: (
                  <span style={{ fontWeight: 600, color: COLORS.white }} />
                ),
              }}
            />
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          size="large"
          sx={{
            marginTop: "24px",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: "20px",
          }}
          onClick={handleSwitchChain}
          disabled={isSwitching}
        >
          {isSwitching
            ? t("marketDetails.lender.switchChain.switching")
            : t("marketDetails.lender.switchChain.switchNetwork")}
        </Button>
      </>
    )

  return (
    <Box sx={PageContainer}>
      <Box sx={AlertContainer}>
        <Box sx={TypoContainer}>
          <Typography variant="text1" sx={{ marginBottom: "6px" }}>
            {t("marketDetails.lender.switchChain.title")}
          </Typography>

          <Typography variant="text3" color="#8A8C9F">
            <Trans
              i18nKey="marketDetails.lender.switchChain.description"
              values={{ chainName: desiredChainName }}
              components={{
                break: <br />,
                emphasis: (
                  <span style={{ fontWeight: 600, color: COLORS.bunker }} />
                ),
              }}
            />
          </Typography>
        </Box>

        <Button
          size="small"
          variant="contained"
          sx={ButtonStyle}
          onClick={handleSwitchChain}
          disabled={isSwitching}
        >
          {isSwitching
            ? t("marketDetails.lender.switchChain.switching")
            : t("marketDetails.lender.switchChain.switchNetwork")}
        </Button>
      </Box>
    </Box>
  )
}
