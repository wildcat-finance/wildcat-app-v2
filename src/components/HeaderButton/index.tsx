"use client"

import { Button } from "@mui/material"
import { ConnectButton } from "@/components/HeaderButton/style"
import { useState, useCallback } from "react"
import { useAccount } from "wagmi"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

import { ProfileDialog } from "@/components/HeaderButton/ProfileDialog"
import { ConnectWalletDialog } from "@/components/HeaderButton/ConnectWalletDialog"

export const HeaderButton = () => {
  const { address, isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

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

      {isConnected ? (
        <ProfileDialog open={open} handleClose={handleClose} />
      ) : (
        <ConnectWalletDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}
