"use client"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { ConnectButton } from "@/components/Header/style"
import { useState } from "react"
import { COLORS } from "@/theme/colors"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"

export const ConnectWalletDialog = () => {
  const { isConnected, chainId } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Button size="medium" sx={ConnectButton} onClick={handleClickOpen}>
        Connect a wallet
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            height: "256px",
            width: "320px",
            borderRadius: "12px",
            borderColor: "#0000001A",
            margin: 0,
            padding: "24px 20px 20px",

            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        }}
      >
        <Typography variant="text1" sx={{ textAlign: "center" }}>
          Connect Wallet
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", rowGap: "4px" }}>
          {connectors.map((connector) => (
            <Button
              variant="contained"
              fullWidth
              onClick={() => connect({ connector })}
            >
              <Typography variant="text2">{connector.name}</Typography>
            </Button>
          ))}
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
