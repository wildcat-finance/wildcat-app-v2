"use client"

import { useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { SaleConnectWalletDialog } from "@/app/[locale]/sale/components/SaleConnectWalletDialog"
import { SaleProfileDialog } from "@/app/[locale]/sale/components/SaleProfileDialog"
import Arrow from "@/assets/icons/upArrow_icon.svg"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

const ButtonStyles = {
  width: "106px",
}

const ProfileBoxStyles = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  cursor: "pointer",
}

const AvatarBoxStyles = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: COLORS.athensGrey,
}

const DropdownIcon = ({ open }: { open: boolean }) => (
  <SvgIcon
    sx={{
      transform: `rotate(${open ? "180deg" : "0deg"})`,
      "& path": { fill: COLORS.santasGrey },
    }}
  >
    <Arrow />
  </SvgIcon>
)

export const SaleProfileButton = () => {
  const { address, isConnected } = useAccount()
  const { data } = useGetBorrowerProfile(address)
  const { isWrongNetwork } = useCurrentNetwork()

  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  if (!address || !isConnected) {
    return (
      <>
        <Button
          variant="contained"
          size="small"
          sx={ButtonStyles}
          onClick={handleOpen}
        >
          Connect Wallet
        </Button>

        <SaleConnectWalletDialog open={open} handleClose={handleClose} />
      </>
    )
  }

  return (
    <>
      <Box sx={ProfileBoxStyles} onClick={handleOpen}>
        <Box sx={AvatarBoxStyles} />

        <Typography variant="text3">
          {isWrongNetwork ? "Wrong Network" : trimAddress(address)}
        </Typography>

        <DropdownIcon open={open} />
      </Box>

      <SaleProfileDialog
        open={open}
        handleClose={handleClose}
        name={data?.name}
      />
    </>
  )
}
