"use client"

import { useState } from "react"

import { Button, SvgIcon, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { NetworkSelectDialog } from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog"
import { ConnectButton } from "@/components/Header/HeaderNetworkButton/style"
import { MobileSelectNetwork } from "@/components/MobileSelectNetwork"
import { NetworkIcon } from "@/components/NetworkIcon"
import { NETWORKS_BY_ID } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { COLORS } from "@/theme/colors"

type HeaderNetworkButtonProps = {
  mobile?: boolean
}

export const HeaderNetworkButton = ({
  mobile = false,
}: HeaderNetworkButtonProps) => {
  const { targetChainId } = useCurrentNetwork()
  const network = NETWORKS_BY_ID[targetChainId as SupportedChainId]

  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        size="medium"
        sx={
          mobile
            ? {
                minWidth: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px 4px 4px",
                borderRadius: "20px",
                backgroundColor: COLORS.whiteSmoke,
                color: COLORS.bunker,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: COLORS.whiteLilac,
                },
              }
            : ConnectButton
        }
        onClick={handleClickOpen}
        aria-label={`Select network. Current network: ${network.name}`}
      >
        <NetworkIcon
          chainId={targetChainId as SupportedChainId}
          width={mobile ? 20 : 24}
          height={mobile ? 20 : 24}
        />
        <Typography
          variant={mobile ? "text3" : "text2"}
          sx={{ whiteSpace: "nowrap", lineHeight: 1, color: "inherit" }}
        >
          {network.name}{" "}
          {network.isTestnet &&
            !network.name.toLowerCase().includes("testnet") &&
            "(Testnet)"}
        </Typography>
        {mobile && (
          <SvgIcon
            sx={{
              fontSize: "16px",
              flexShrink: 0,
              "& path": { fill: COLORS.santasGrey },
            }}
          >
            <UpArrow />
          </SvgIcon>
        )}
      </Button>

      {mobile ? (
        <MobileSelectNetwork open={open} handleClose={handleClose} />
      ) : (
        <NetworkSelectDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}
