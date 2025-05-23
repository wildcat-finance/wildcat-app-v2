"use client"

import { useState, useEffect } from "react"

import { Button, useMediaQuery } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { ConnectWalletDialog } from "@/components/Header/HeaderButton/ConnectWalletDialog"
import { ProfileDialog } from "@/components/Header/HeaderButton/ProfileDialog"
import { ConnectButton } from "@/components/Header/HeaderButton/style"
import { MobileConnectWallet } from "@/components/MobileConnectWallet"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { trimAddress } from "@/utils/formatters"

export const HeaderButton = () => {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { data } = useGetBorrowerProfile(address)
  const isMobile = useMediaQuery("(max-width:600px)")

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

      {isConnected && address ? (
        <ProfileDialog
          open={open}
          handleClose={handleClose}
          name={data?.name}
          alias={data?.alias}
          avatar={data?.avatar}
        />
      ) : (
        <>
          {!isMobile && (
            <ConnectWalletDialog open={open} handleClose={handleClose} />
          )}
          {isMobile && (
            <MobileConnectWallet open={open} handleClose={handleClose} />
          )}
        </>
      )}
    </>
  )
}
