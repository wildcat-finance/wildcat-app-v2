"use client"

import { Dispatch, SetStateAction, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount, useDisconnect } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Menu from "@/assets/icons/burgerMenu_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { MobileConnectWallet } from "@/components/MobileConnectWallet"
import { MobileSelectNetwork } from "@/components/MobileSelectNetwork"
import { NetworkIcon } from "@/components/NetworkIcon"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type MobileMenuProps = {
  open: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

const TextButtonStyles = {
  minWidth: "fit-content",
  "&:hover": {
    color: COLORS.bunker,
    background: "transparent",
    boxShadow: "none",
  },
}

export const MobileMenu = ({ open, setIsOpen }: MobileMenuProps) => {
  const { address, isConnected } = useAccount()
  const pathname = usePathname()
  const isMain = pathname.includes("lender") || pathname.includes("borrower")

  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(address as `0x${string}`)

  const { disconnect } = useDisconnect()
  const handleToggleModal = () => {
    setIsOpen(!open)
  }
  const selectedNetwork = useSelectedNetwork()

  const [openConnect, setOpenConnect] = useState<boolean>(false)
  const [openSelectNetwork, setOpenSelectNetwork] = useState<boolean>(false)
  const handleToggleConnect = () => {
    setOpenConnect(!openConnect)
  }
  const handleToggleSelectNetwork = () => {
    setOpenSelectNetwork(!openSelectNetwork)
  }
  const { getAddressUrl } = useBlockExplorer()

  const handleClickDisconnect = () => {
    disconnect()
    handleToggleModal()
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {isConnected && address && !open && (
          <Box
            onClick={handleToggleConnect}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              backgroundColor: COLORS.whiteSmoke,
              borderRadius: "20px",
              padding: "2px 6px 2px 2px",
              gap: "4px",
            }}
          >
            {profileData && profileData.avatar ? (
              <Image
                src={profileData.avatar}
                alt="avatar"
                width={24}
                height={24}
                style={{ borderRadius: "50%" }}
              />
            ) : (
              <SvgIcon sx={{ fontSize: "24px" }}>
                <Avatar />
              </SvgIcon>
            )}
            <Typography variant="text3">
              {trimAddress(address as string)}
            </Typography>
            <SvgIcon
              sx={{
                fontSize: "16px",
                "& path": {
                  fill: COLORS.santasGrey,
                },
              }}
            >
              <UpArrow />
            </SvgIcon>
          </Box>
        )}

        <IconButton
          onClick={handleToggleModal}
          sx={{
            marginLeft: "12px",
            display: "flex",
            width: "40px",
            height: "40px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SvgIcon
            sx={{
              fontSize: !open ? "40px" : "30px",
              "& path": {
                stroke: isMain && !open ? COLORS.black : COLORS.white,
              },
            }}
          >
            {!open || openConnect ? <Menu /> : <Cross />}
          </SvgIcon>
        </IconButton>
      </Box>

      <Dialog
        open={open}
        onClose={handleToggleModal}
        fullWidth
        sx={{
          height: openConnect ? "0px" : "calc(100dvh - 64px)",
          marginTop: "auto",
          zIndex: 4,

          "& .MuiPaper-root.MuiDialog-paper": {
            border: "none",
            margin: "0 4px auto",
            width: "100%",
            maxWidth: "100%",
            padding: "8px",
          },
          "& .MuiBackdrop-root": {
            marginTop: "auto",
            height: "calc(100dvh - 0px)",
            backgroundColor: "transparent",
            backdropFilter: "blur(20px)",
          },
        }}
      >
        {isConnected && address && (
          <Box
            sx={{
              width: "100%",
              borderRadius: "20px",
              padding: "6px 4px",
              backgroundColor: COLORS.whiteSmoke,
              display: "flex",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            {profileData && profileData.avatar ? (
              <Image
                src={profileData.avatar}
                style={{ borderRadius: "50%" }}
                alt="avatar"
                width={24}
                height={24}
              />
            ) : (
              <SvgIcon sx={{ fontSize: "24px" }}>
                <Avatar />
              </SvgIcon>
            )}

            <Typography variant="text3">
              {trimAddress(address as string, 20)}
            </Typography>

            <Box marginLeft="auto" paddingRight="8px">
              <LinkGroup
                linkValue={getAddressUrl(address as string)}
                copyValue={address}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ padding: "0 6px" }}>
          <Link
            href="https://t.me/+93oOPZh5tDI1ZDdk"
            style={{ display: "flex", textDecoration: "none" }}
          >
            <Button size="large" fullWidth sx={TextButtonStyles}>
              Help
            </Button>
          </Link>
          <Divider sx={{ width: "100%" }} />
          <Link
            href="https://docs.wildcat.finance/"
            style={{ display: "flex", textDecoration: "none" }}
          >
            <Button size="large" fullWidth sx={TextButtonStyles}>
              Docs
            </Button>
          </Link>
          <Divider sx={{ width: "100%" }} />
          <Link href={ROUTES.lender.root} style={{ textTransform: "none" }}>
            <Button size="large" fullWidth sx={TextButtonStyles}>
              App
            </Button>
          </Link>
        </Box>

        <Box sx={{ padding: "0 6px" }}>
          <Button
            size="large"
            fullWidth
            sx={{
              borderRadius: "10px",
              marginTop: "6px",
              backgroundColor: COLORS.whiteSmoke,
              color: COLORS.bunker,
              gap: "4px",
              "&:hover": {
                backgroundColor: COLORS.blueRibbon,
                color: COLORS.white,
              },
            }}
            onClick={handleToggleSelectNetwork}
          >
            <NetworkIcon chainId={selectedNetwork.chainId} />
            {selectedNetwork.name}

            {selectedNetwork.isTestnet &&
              !selectedNetwork.name.toLowerCase().includes("testnet") &&
              "(Testnet)"}
          </Button>
        </Box>

        {isConnected ? (
          <>
            <Button
              fullWidth
              size="large"
              onClick={() => setOpenConnect(true)}
              sx={{
                marginTop: "6px",
                borderRadius: "10px",
                backgroundColor: COLORS.whiteSmoke,
              }}
            >
              Switch Account
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleClickDisconnect}
              sx={{ marginTop: "6px", borderRadius: "10px" }}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            size="large"
            onClick={handleToggleConnect}
            sx={{
              borderRadius: "10px",
              marginTop: "6px",
              backgroundColor: COLORS.ultramarineBlue,
              color: COLORS.white,
              "&:hover": {
                backgroundColor: COLORS.blueRibbon,
                color: COLORS.white,
              },
            }}
          >
            Connect
          </Button>
        )}
      </Dialog>

      <MobileSelectNetwork
        open={openSelectNetwork}
        handleClose={handleToggleSelectNetwork}
      />

      <MobileConnectWallet
        open={openConnect}
        handleClose={handleToggleConnect}
      />
    </>
  )
}
