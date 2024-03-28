"use client"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { ConnectButton } from "@/components/Header/style"
import { useState, useCallback } from "react"
import { COLORS } from "@/theme/colors"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { sepolia } from "wagmi/chains"
import { TargetNetwork } from "@/config/network"

export const ConnectWalletDialog = () => {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { isWrongNetwork } = useCurrentNetwork()
  const { switchChain } = useSwitchChain()

  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const getButtonText = useCallback(() => {
    if (isConnected && isWrongNetwork) {
      return "Wrong Network"
    }
    if (isConnected && address) {
      return `${address.slice(0, 4)}..${address.slice(-4, address.length)}`
    }
    return "Connect a wallet"
  }, [isConnected, address, isWrongNetwork])

  return (
    <>
      <Button size="medium" sx={ConnectButton} onClick={handleClickOpen}>
        {getButtonText()}
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            width: "320px",
            borderRadius: "12px",
            borderColor: "#0000001A",
            margin: 0,
            padding: "24px 20px 20px",

            display: "flex",
            flexDirection: "column",
            rowGap: "32px",
          },
        }}
      >
        <Typography variant="text1" sx={{ textAlign: "center" }}>
          {getButtonText()}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", rowGap: "4px" }}>
          {!isConnected &&
            connectors
              .filter(
                (connector) =>
                  !(connector.name === "Safe" || connector.name === "Injected"),
              )
              .map((connector) => (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => connect({ connector })}
                >
                  <Typography variant="text2">{connector.name}</Typography>
                </Button>
              ))}
          {isConnected && (
            <Button variant="contained" fullWidth onClick={() => disconnect()}>
              <Typography variant="text2">Disconnect</Typography>
            </Button>
          )}
          {isConnected && isWrongNetwork && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              <Typography variant="text2">
                Switch to {TargetNetwork.name}
              </Typography>
            </Button>
          )}
        </Box>
        <Typography
          variant="text4"
          sx={{
            maxWidth: "280px",
            textAlign: "center",
            color: COLORS.greySuit,
          }}
        >
          By connecting a wallet, you agree to Wildcat Terms of Service ans
          consent to its Privacy Policy
        </Typography>
      </Dialog>
    </>
  )
}
