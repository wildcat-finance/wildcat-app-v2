"use client"

import { useState, useEffect } from "react"

import { Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { NetworkSelectDialog } from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog"
import { ConnectButton } from "@/components/Header/HeaderNetworkButton/style"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

export const HeaderNetworkButton = () => {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { data } = useGetBorrowerProfile(address)
  const isMobile = useMobileResolution()

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
      setButtonText(t("header.button.wrongNetwork"))
    } else if (isConnected && address) {
      setButtonText(trimAddress(address))
    } else if (!isConnected) {
      setButtonText(t("header.button.connectWallet"))
    }
  }, [isConnected, address, isWrongNetwork])

  return (
    <>
      <Button size="medium" sx={ConnectButton} onClick={handleClickOpen}>
        Select Network
      </Button>

      <NetworkSelectDialog open={open} handleClose={handleClose} />
    </>
  )
}
