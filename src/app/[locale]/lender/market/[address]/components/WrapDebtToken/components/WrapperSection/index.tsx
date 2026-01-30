import React from "react"

import { Box, Button, SvgIcon, Tabs, Tab, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Check from "@/assets/icons/check_icon.svg"
import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setInitialAmount,
  setWrappedAmount,
} from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

import { ErrorWrapperAlert } from "../../../../../../../../../components/WrapDebtToken/ErrorWrapperAlert"
import { SuccessWrapperModal } from "../../../../../../../../../components/WrapDebtToken/SuccessWrapperModal"
import { WrapperExchangeBanner } from "../../../../../../../../../components/WrapDebtToken/WrapperExchangeBanner"
import { WrapperHeader } from "../../../../../../../../../components/WrapDebtToken/WrapperHeader"

const mockAddress = "0x000000000000000000000000000000000000"
const mockExchangeRate = 1

const TabStyle = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 500,

  height: "28px",
  minHeight: "28px",

  maxWidth: "100%",
  width: "50%",

  borderColor: COLORS.athensGrey,
}

enum TokenWrapperFormTabs {
  WRAP = "wrap",
  UNWRAP = "unwrap",
}

export const WrapperSection = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [tab, setTab] = React.useState<TokenWrapperFormTabs>(
    TokenWrapperFormTabs.WRAP,
  )
  const [amount, setAmount] = React.useState<number | undefined>(undefined)

  const initialAmount = useAppSelector(
    (state) => state.wrapDebtTokenFlow.initialAmount,
  )
  const wrappedAmount = useAppSelector(
    (state) => state.wrapDebtTokenFlow.wrappedAmount,
  )

  // Mock states
  const [isMockApproved, setIsMockApproved] = React.useState<boolean>(false)
  const [isMockApproving, setIsMockApproving] = React.useState<boolean>(false)
  const [isMockWrapping, setIsMockWrapping] = React.useState<boolean>(false)
  const [isMockSuccess, setIsMockSuccess] = React.useState<boolean>(false)
  const [isMockError, setIsMockError] = React.useState<boolean>(false)

  const isWrapTab = tab === TokenWrapperFormTabs.WRAP
  const isNoAmount = amount === 0 || amount === undefined
  const calculatedWrappedAmount = (amount ?? 0) * mockExchangeRate
  const isApproveButtonDisabled =
    isNoAmount || isMockApproved || isMockApproving
  const isMainButtonDisabled =
    isNoAmount || !isMockApproved || isMockWrapping || isMockSuccess

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(event.target.value))
    setIsMockApproved(false)
    setIsMockSuccess(false)
    setIsMockError(false)
  }

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: TokenWrapperFormTabs,
  ) => {
    setTab(newTab)
    setAmount(undefined)
    setIsMockApproved(false)
  }

  const handleMockApprove = () => {
    setIsMockApproving(true)
    setTimeout(() => {
      setIsMockApproving(false)
      setIsMockApproved(true)
    }, 5000)
  }

  const handleWrap = () => {
    setIsMockWrapping(true)
    setTimeout(() => {
      setIsMockWrapping(false)
      // If amount <= 100, show success; if > 100, show error
      if (amount !== undefined && amount > 100) {
        setIsMockError(true)
      } else {
        setIsMockSuccess(true)
        // Update balances on successful transaction
        if (amount !== undefined) {
          if (isWrapTab) {
            // Wrap: decrease initialAmount, increase wrappedAmount
            dispatch(setInitialAmount(initialAmount - amount))
            dispatch(
              setWrappedAmount(wrappedAmount + amount * mockExchangeRate),
            )
          } else {
            // Unwrap: increase initialAmount, decrease wrappedAmount
            dispatch(
              setInitialAmount(initialAmount + amount * mockExchangeRate),
            )
            dispatch(setWrappedAmount(wrappedAmount - amount))
          }
        }
      }
    }, 5000)
  }

  const handleClose = () => {
    setIsMockSuccess(false)
    setIsMockApproved(false)
    setAmount(undefined)
  }

  return (
    <Box marginTop="4px">
      <WrapperHeader contractAddress={mockAddress} />

      <WrapperExchangeBanner />

      <Tabs
        value={tab}
        onChange={handleTabsChange}
        sx={{
          width: "100%",
          height: "28px",
          minHeight: "28px",
          marginBottom: "24px",
        }}
      >
        <Tab value={TokenWrapperFormTabs.WRAP} label="Wrap" sx={TabStyle} />
        <Tab value={TokenWrapperFormTabs.UNWRAP} label="Unwrap" sx={TabStyle} />
      </Tabs>

      {isWrapTab && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Typography variant="text3">Amount to wrap</Typography>

            <NumberTextField
              value={amount}
              onChange={handleAmountChange}
              size="medium"
              label="Amount"
              endAdornment={
                <TextfieldButton buttonText="Max" onClick={() => null} />
              }
            />
          </Box>

          <Box
            sx={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Typography variant="text3">
              You’ll receive wrapped tokens
            </Typography>

            <Box
              sx={{
                width: "100%",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                borderRadius: "10px",
                border: `1px solid ${COLORS.iron}`,
              }}
            >
              <Typography variant="text3">
                ~ {calculatedWrappedAmount} WETH
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <SvgIcon
                sx={{ fontSize: "12px", "& path": { fill: COLORS.manate } }}
              >
                <Question />
              </SvgIcon>

              <Typography variant="text4" color={COLORS.manate}>
                Estimates may change with the current conversion rate.
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {!isWrapTab && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Typography variant="text3">Amount to unwrap</Typography>

            <NumberTextField
              value={amount}
              onChange={handleAmountChange}
              size="medium"
              label="Amount"
              endAdornment={
                <TextfieldButton buttonText="Max" onClick={() => null} />
              }
            />
          </Box>

          <Box
            sx={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Typography variant="text3">
              You’ll receive unwrapped tokens
            </Typography>

            <Box
              sx={{
                width: "100%",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                borderRadius: "10px",
                border: `1px solid ${COLORS.iron}`,
              }}
            >
              <Typography variant="text3">
                ~ {calculatedWrappedAmount} ETH
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <SvgIcon
                sx={{ fontSize: "12px", "& path": { fill: COLORS.manate } }}
              >
                <Question />
              </SvgIcon>

              <Typography variant="text4" color={COLORS.manate}>
                Estimates may change with the current conversion rate.
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={handleMockApprove}
          disabled={isApproveButtonDisabled}
          sx={{ display: "flex", alignItems: "center", gap: "3px" }}
        >
          {isMockApproved && (
            <SvgIcon
              fontSize="medium"
              sx={{
                marginRight: "3px",
                "& path": {
                  fill: `${COLORS.santasGrey}`,
                },
              }}
            >
              <Check />
            </SvgIcon>
          )}

          {isMockApproving && <MiniLoader />}

          {/* eslint-disable-next-line no-nested-ternary */}
          {isMockApproving
            ? "Approving"
            : isMockApproved
              ? "Approved"
              : "Approve"}
        </Button>

        <Button
          variant="contained"
          size="large"
          onClick={handleWrap}
          disabled={isMainButtonDisabled}
          sx={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          {isMockWrapping && <MiniLoader />}

          {isMockWrapping
            ? `${isWrapTab ? "Wrapping" : "Unwrapping"}`
            : `${isWrapTab ? "Wrap" : "Unwrap"} Tokens`}
        </Button>
      </Box>

      {isMockError && <ErrorWrapperAlert isWrapping={isWrapTab} />}

      <SuccessWrapperModal
        isWrapping={isWrapTab}
        open={isMockSuccess}
        onClose={handleClose}
        initialAmount={amount}
        initialAsset={isWrapTab ? "ETH" : "WETH"}
        finalAmount={amount}
        finalAsset={isWrapTab ? "WETH" : "ETH"}
        txHash={mockAddress}
      />
    </Box>
  )
}
