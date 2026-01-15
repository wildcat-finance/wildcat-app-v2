import React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useAccount, useSwitchChain } from "wagmi"

import Clock from "@/assets/icons/clock_icon.svg"
import { NETWORKS } from "@/config/network"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"
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
  const { switchChain } = useSwitchChain()
  const { address } = useAccount()
  const dispatch = useAppDispatch()

  const isMobile = useMobileResolution()

  const desiredChainName =
    PrimaryNetworks.find((chain) => chain.chainId === desiredChainId)?.name ??
    "Unknown Network"

  const handleSwitchChain = () => {
    if (address) {
      switchChain({ chainId: desiredChainId })
    }
    dispatch(setSelectedNetwork(desiredChainId))
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
          Wrong Market Network
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
            Currently, you can only view general information about the market.
            <br />
            To interact with it, please change the network to{" "}
            <span style={{ fontWeight: 600, color: COLORS.white }}>
              {desiredChainName}
            </span>
            .
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
        >
          Switch Network
        </Button>
      </>
    )

  return (
    <Box sx={PageContainer}>
      <Box sx={AlertContainer}>
        <Box sx={TypoContainer}>
          <Typography variant="text1" sx={{ marginBottom: "6px" }}>
            Wrong Market Network
          </Typography>

          <Typography variant="text3" color="#8A8C9F">
            Currently, you can only view general information about the market.
            <br />
            To interact with it, please change the network to{" "}
            <span style={{ fontWeight: 600, color: COLORS.bunker }}>
              {desiredChainName}
            </span>
            .
          </Typography>
        </Box>

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
