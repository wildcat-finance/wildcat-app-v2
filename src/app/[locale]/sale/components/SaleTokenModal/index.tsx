"use client"

import { ReactNode, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { endDecorator } from "@/app/[locale]/borrower/(new-market)/components/NewMarketForm/style"
import { SaleAssetSelect } from "@/app/[locale]/sale/components/SaleAssetSelect"
import { SaleConnectWalletDialog } from "@/app/[locale]/sale/components/SaleConnectWalletDialog"
import ConnectStepBg from "@/assets/pictures/sale_token_modal_connected_bg.webp"
import DisconnectStepBg from "@/assets/pictures/sale_token_modal_disconnected_bg.webp"
import { NumberTextField } from "@/components/NumberTextfield"
import { TooltipButton } from "@/components/TooltipButton"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { COLORS } from "@/theme/colors"

export const SaleTokenModalBox = ({
  children,
  background,
}: {
  children: ReactNode
  background: string
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      height: "327px",
      width: "319px",
      borderRadius: "16px",
      padding: "18px",

      backgroundImage: `url(${background})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "100% 100%",
    }}
  >
    {children}
  </Box>
)

export const SaleTokenModal = () => {
  const { isWrongNetwork } = useCurrentNetwork()
  const { address, isConnected } = useAccount()
  const [openConnect, setOpenConnect] = useState(false)

  const handleOpen = () => {
    setOpenConnect(true)
  }

  const handleClose = () => {
    setOpenConnect(false)
  }

  if (!isConnected) {
    return (
      <SaleTokenModalBox background={DisconnectStepBg.src}>
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            <Typography variant="title3" color={COLORS.whiteSmoke}>
              Get WILD Token
            </Typography>
            <Typography variant="text3" color={COLORS.whiteSmoke}>
              You should connect your wallet first
            </Typography>
          </Box>

          <>
            <Button variant="contained" color="secondary" onClick={handleOpen}>
              Connect Wallet
            </Button>

            <SaleConnectWalletDialog
              open={openConnect}
              handleClose={handleClose}
            />
          </>
        </Box>
      </SaleTokenModalBox>
    )
  }

  if (isConnected) {
    return (
      <SaleTokenModalBox background={ConnectStepBg.src}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Typography variant="title3" color={COLORS.whiteSmoke}>
            Get WILD Token
          </Typography>
          <NumberTextField
            sx={{
              "& .MuiInputBase-input": {
                padding: "11px 0",
              },

              "& .MuiInputBase-root": {
                border: `1px solid #E6E7EB33`,
                color: COLORS.whiteLilac,
                padding: "0 16px",

                "&:hover": {
                  border: `1px solid ${COLORS.white06}`,
                },

                "&.Mui-focused": {
                  border: `1px solid ${COLORS.white06}`,
                },
              },
            }}
            size="medium"
            endAdornment={
              <Typography
                variant="text4"
                color={COLORS.whiteSmoke}
                sx={{ opacity: 0.6 }}
              >
                WLDC
              </Typography>
            }
          />
          <NumberTextField
            size="medium"
            sx={{
              "& .MuiInputBase-input": {
                padding: "11px 0",
              },

              "& .MuiInputBase-root": {
                border: `1px solid #E6E7EB33`,
                color: COLORS.whiteLilac,
                padding: "0 16px",

                "&:hover": {
                  border: `1px solid ${COLORS.white06}`,
                },

                "&.Mui-focused": {
                  border: `1px solid ${COLORS.white06}`,
                },
              },
            }}
            endAdornment={<SaleAssetSelect />}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flexGrow: 1,
            width: "100%",
            marginTop: "32px",
            opacity: 0.6,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <Typography variant="text4" color={COLORS.whiteLilac}>
                Price
              </Typography>
              <TooltipButton value="TBD" />
            </Box>
            <Typography variant="text4" color={COLORS.whiteLilac}>
              1 USDC = 35 WLDC
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <Typography variant="text4" color={COLORS.whiteLilac}>
                Price Impact
              </Typography>
              <TooltipButton value="TBD" />
            </Box>
            <Typography variant="text4" color={COLORS.whiteLilac}>
              3.784%
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" color="secondary">
          Get
        </Button>
      </SaleTokenModalBox>
    )
  }
}
