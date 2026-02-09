"use client"

import { useState, useEffect } from "react"
import * as React from "react"

import { Box, Button, Chip, SvgIcon, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import Avatar from "@/assets/icons/avatar_icon.svg"
import DownArrowIcon from "@/assets/icons/downArrow_icon.svg"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import WalletIcon from "@/assets/icons/wallet_icon.svg"
import { NetworkSelectDialog } from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog"
import { ConnectButton } from "@/components/Header/HeaderNetworkButton/style"
import { NetworkIcon } from "@/components/NetworkIcon"
import { NETWORKS_BY_ID } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const HeaderNetworkButton = () => {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { data } = useGetBorrowerProfile(address)
  const isMobile = useMobileResolution()

  const { isWrongNetwork, targetChainId } = useCurrentNetwork()
  const network = NETWORKS_BY_ID[targetChainId as SupportedChainId]

  const [open, setOpen] = useState(false)
  const [buttonText, setButtonText] = useState("")

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  useEffect(() => {
    if (isConnected && isWrongNetwork) {
      setButtonText(t("header.button.wrongNetwork"))
    } else if (isConnected && address) {
      setButtonText(trimAddress(address))
    } else if (!isConnected) {
      setButtonText(t("header.button.connectWallet"))
    }
  }, [isConnected, address, isWrongNetwork])

  return (
    <>
      {!isMobile && (
        <Button size="medium" sx={ConnectButton} onClick={handleClickOpen}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <NetworkIcon chainId={targetChainId as SupportedChainId} />

            <Typography
              variant="text3"
              sx={{ fontWeight: 600, color: "white", lineHeight: "20px" }}
            >
              {network.name}
            </Typography>

            {network.isTestnet && (
              <Chip
                label="Testnet"
                variant="filled"
                sx={{
                  backgroundColor: COLORS.white03,
                  color: COLORS.white,
                  height: "auto",
                }}
              />
            )}
          </Box>

          <SvgIcon
            component={DownArrowIcon}
            sx={{ fontSize: "16px", "& path": { fill: "white" } }}
          />
        </Button>
      )}

      {isMobile && (
        <Box
          onClick={handleClickOpen}
          sx={{
            marginRight: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            backgroundColor: COLORS.whiteSmoke,
            borderRadius: "20px",
            padding: "2px 6px 2px 2px",
            gap: "4px",
          }}
        >
          <Box
            sx={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.whiteLilac,
            }}
          >
            <NetworkIcon
              chainId={targetChainId as SupportedChainId}
              width={14}
              height={14}
            />
          </Box>

          <Chip
            label={network.isTestnet ? "Testnet" : "Mainnet"}
            variant="filled"
            sx={{
              backgroundColor: COLORS.hawkesBlue,
              color: COLORS.cornflowerBlue,
              height: "auto",
            }}
          />

          <SvgIcon
            sx={{
              fontSize: "16px",
              "& path": {
                fill: COLORS.santasGrey,
              },
            }}
          >
            <UpArrow />
          </SvgIcon>
        </Box>
      )}

      <NetworkSelectDialog open={open} handleClose={handleClose} />
    </>
  )
}
