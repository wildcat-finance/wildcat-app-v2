"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Button } from "@mui/material"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

import { ConnectButton } from "@/components/HeaderButton/style"
import { ProfileDialog } from "@/components/HeaderButton/ProfileDialog"
import { ConnectWalletDialog } from "@/components/HeaderButton/ConnectWalletDialog"
import { useRouter } from "next/navigation"
import { useHasSignedSla } from "@/hooks/useHasSignedSla"

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

  // const router = useRouter()
  // const { hasSignedAgreement } = useHasSignedSla()
  // useEffect(() => {
  //   if (!hasSignedAgreement) {
  //     router.push("/agreement")
  //   }
  // })

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
