"use client"

import { useState, useEffect } from "react"

import { Button } from "@mui/material"
import { useAccount } from "wagmi"

import { ConnectWalletDialog } from "@/components/Header/HeaderButton/ConnectWalletDialog"
import { ProfileDialog } from "@/components/Header/HeaderButton/ProfileDialog"
import { ConnectButton } from "@/components/Header/HeaderButton/style"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export const HeaderButton = () => {
  const { address, isConnected } = useAccount()

  const { isWrongNetwork } = useCurrentNetwork()

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
      setButtonText("Wrong Network")
    } else if (isConnected && address) {
      setButtonText(
        `${address.slice(0, 4)}..${address.slice(-4, address.length)}`,
      )
    } else if (!isConnected) {
      setButtonText("Connect a wallet")
    }
  }, [isConnected, address, isWrongNetwork])

  return (
    <>
      <Button size="medium" sx={ConnectButton} onClick={handleClickOpen}>
        {buttonText}
      </Button>

      {isConnected ? (
        <ProfileDialog open={open} handleClose={handleClose} />
      ) : (
        <ConnectWalletDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}
