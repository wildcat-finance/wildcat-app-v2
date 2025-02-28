"use client"

import { ReactNode, useEffect, useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { endDecorator } from "@/app/[locale]/borrower/(new-market)/components/NewMarketForm/style"
import { SaleAssetSelect } from "@/app/[locale]/sale/components/SaleAssetSelect"
import { SaleConnectWalletDialog } from "@/app/[locale]/sale/components/SaleConnectWalletDialog"
import Change from "@/assets/icons/change_icon.svg"
import ConfirmStepBg from "@/assets/pictures/sale_token_modal_confirm_bg.webp"
import ConnectStepBg from "@/assets/pictures/sale_token_modal_connected_bg.webp"
import DisconnectStepBg from "@/assets/pictures/sale_token_modal_disconnected_bg.webp"
import FinalStepBg from "@/assets/pictures/sale_token_modal_final_bg.webp"
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
  const [selectedToken, setSelectedToken] = useState<string>(
    "0x07c8082984e97f52744116ed7f58381da786ca5b",
  )

  const [amount, setAmount] = useState<number>(0)
  const [tokenAmount, setTokenAmount] = useState<number>(0)

  const [step, setStep] = useState<"getValues" | "confirmation" | "final">(
    "getValues",
  )

  const handleOpen = () => {
    setOpenConnect(true)
  }

  const handleClose = () => {
    setOpenConnect(false)
  }

  const handleChangeAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(event.target.value))
  }

  useEffect(() => {
    setTokenAmount(amount * 35)
  }, [amount])

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

  if (isConnected && step === "getValues") {
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
            value={amount}
            onChange={handleChangeAmount}
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
            value={tokenAmount}
            disabled
            size="medium"
            sx={{
              "& .MuiInputBase-input": {
                padding: "11px 0",
              },

              "& .MuiInputBase-root": {
                border: `1px solid #E6E7EB33`,
                color: COLORS.whiteLilac,
                padding: 0,
                paddingLeft: "16px",

                "&:hover": {
                  border: `1px solid ${COLORS.white06}`,
                },

                "&.Mui-focused": {
                  border: `1px solid ${COLORS.white06}`,
                },

                "&.Mui-disabled": {
                  border: `1px solid #E6E7EB33`,
                  color: COLORS.whiteLilac,
                  opacity: 1,
                },

                "& .MuiInputBase-input.MuiFilledInput-input.Mui-disabled.MuiInputBase-inputAdornedEnd":
                  {
                    WebkitTextFillColor: "unset",
                  },
              },
            }}
            endAdornment={
              <SaleAssetSelect
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
              />
            }
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

        <Button
          variant="contained"
          color="secondary"
          disabled={amount === 0}
          onClick={() => setStep("confirmation")}
        >
          Get
        </Button>
      </SaleTokenModalBox>
    )
  }

  if (isConnected && step === "confirmation") {
    return (
      <SaleTokenModalBox background={ConfirmStepBg.src}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <Box
            sx={{
              width: "fit-content",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <Typography variant="text4" color={COLORS.whiteLilac}>
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                You'll pay
              </Typography>
              <TooltipButton value="TBD" />
            </Box>

            <Typography variant="title2" color={COLORS.whiteLilac}>
              {tokenAmount}
            </Typography>
            <Typography variant="text4" color={COLORS.whiteLilac}>
              USDC
            </Typography>
          </Box>

          <SvgIcon sx={{ fontSize: "20px" }}>
            <Change />
          </SvgIcon>

          <Box
            sx={{
              width: "fit-content",
              alignItems: "flex-end",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <Typography variant="text4" color={COLORS.whiteLilac}>
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                You'll get
              </Typography>
              <TooltipButton value="TBD" />
            </Box>

            <Typography variant="title2" color={COLORS.whiteLilac}>
              {amount}
            </Typography>
            <Typography variant="text4" color={COLORS.whiteLilac}>
              WLDC
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
            opacity: 0.6,
            marginBottom: "24px",
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

        <Button
          variant="contained"
          color="secondary"
          disabled={amount === 0}
          onClick={() => setStep("final")}
        >
          Confirm
        </Button>
      </SaleTokenModalBox>
    )
  }

  if (isConnected && step === "final") {
    return (
      <SaleTokenModalBox background={FinalStepBg.src}>
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
            <Typography variant="text1" color={COLORS.whiteSmoke}>
              🎉
            </Typography>
            <Typography variant="title3" color={COLORS.whiteSmoke}>
              You’ve get {amount} WLDC
            </Typography>
            <Typography variant="text3" color={COLORS.whiteSmoke}>
              Check your wallet to see it
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setStep("getValues")
              setAmount(0)
            }}
          >
            Get One More
          </Button>
        </Box>
      </SaleTokenModalBox>
    )
  }
}
