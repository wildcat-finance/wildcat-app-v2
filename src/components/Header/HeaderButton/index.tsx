"use client"

import { useState, useEffect } from "react"

import { Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ConnectWalletDialog } from "@/components/Header/HeaderButton/ConnectWalletDialog"
import { ProfileDialog } from "@/components/Header/HeaderButton/ProfileDialog"
import { ConnectButton } from "@/components/Header/HeaderButton/style"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { trimAddress } from "@/utils/formatters"
import BorrowerRegistrationListener from "@/utils/listeners"
import PollingBorrowerRegistration from "@/utils/polling"

export const HeaderButton = () => {
  const { t } = useTranslation()
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
        {buttonText}
      </Button>

      {isConnected ? (
        <>
          {/* <BorrowerRegistrationListener /> */}
          <PollingBorrowerRegistration address={address} />
          <ProfileDialog open={open} handleClose={handleClose} />
        </>
      ) : (
        <ConnectWalletDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}
