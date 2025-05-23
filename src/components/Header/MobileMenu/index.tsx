"use client"

import { Dispatch, SetStateAction, useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount, useDisconnect } from "wagmi"

import Menu from "@/assets/icons/burgerMenu_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { MobileConnectWallet } from "@/components/MobileConnectWallet"
import { EtherscanBaseUrl } from "@/config/network"
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

  const handleToggleModal = () => {
    setIsOpen(!open)
  }

  const [openConnect, setOpenConnect] = useState<boolean>(false)

  const handleCloseConnect = () => {
    setOpenConnect(false)
  }

  const { disconnect } = useDisconnect()
  const handleClickDisconnect = () => {
    disconnect()
    handleToggleModal()
  }

  return (
    <>
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

      <Dialog
        open={open}
        onClose={handleToggleModal}
        fullWidth
        sx={{
          height: openConnect ? "0px" : "calc(100vh - 64px)",
          marginTop: "auto",

          "& .MuiPaper-root.MuiDialog-paper": {
            margin: "0 4px auto",
            width: "100%",
            padding: "8px",
          },
          "& .MuiBackdrop-root": {
            marginTop: "auto",
            height: "calc(100vh - 0px)",
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
            <Box
              sx={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: COLORS.santasGrey,
                marginRight: "7px",
              }}
            />

            <Typography variant="text3">
              {trimAddress(address as string, 30)}
            </Typography>

            <Box marginLeft="auto" paddingRight="8px">
              <LinkGroup
                linkValue={`${EtherscanBaseUrl}/address/${address}`}
                copyValue={address}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ padding: "0 6px" }}>
          <Link
            href="https://x.com/functi0nZer0"
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

        {isConnected ? (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleClickDisconnect}
            sx={{ marginTop: "6px" }}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            size="large"
            onClick={() => setOpenConnect(true)}
            sx={{
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

        <MobileConnectWallet
          open={openConnect}
          handleClose={handleCloseConnect}
        />
      </Dialog>
    </>
  )
}
