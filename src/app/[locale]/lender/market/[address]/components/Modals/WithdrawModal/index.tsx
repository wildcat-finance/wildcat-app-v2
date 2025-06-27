import { ChangeEvent, useEffect, useMemo, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { useWithdraw } from "@/app/[locale]/lender/market/[address]/hooks/useWithdraw"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { WithdrawModalProps } from "./interface"

export const WithdrawModal = ({
  marketAccount,
  isMobileOpen,
  setIsMobileOpen,
}: WithdrawModalProps) => {
  const theme = useTheme()
  const isMobile = useMobileResolution()

  const { t } = useTranslation()
  const { market } = marketAccount

  const notMature =
    market.hooksConfig?.kind === HooksKind.FixedTerm &&
    market.hooksConfig?.fixedTermEndTime !== undefined &&
    market.hooksConfig.fixedTermEndTime * 1000 >= Date.now()

  const [amount, setAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState<TokenAmount>()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()

  const { mutate, isSuccess, isError, isPending } = useWithdraw(
    marketAccount,
    setTxHash,
    !!maxAmount,
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const handleOpenModal = () => {
    setMaxAmount(undefined)
    modal.handleOpenModal()
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
    setMaxAmount(undefined)
  }

  const handleClickMaxAmount = () => {
    setAmount(parseFloat(marketAccount.marketBalance.format(5)).toString())
    setMaxAmount(marketAccount.marketBalance)
  }

  const handleWithdraw = () => {
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleWithdraw()
    setShowErrorPopup(false)
  }

  const underlyingWithdrawAmount = useMemo(
    () =>
      marketAccount.market.underlyingToken.parseAmount(
        amount.replace(/,/g, "") || "0",
      ),
    [amount],
  )

  const withdrawAmount = maxAmount || underlyingWithdrawAmount

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableWithdraw =
    !!error ||
    marketAccount.marketBalance.eq(0) ||
    withdrawAmount.gt(marketAccount.marketBalance) ||
    withdrawAmount.eq(0)

  const { status: withdrawStep } =
    marketAccount.previewQueueWithdrawal(withdrawAmount)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  useEffect(() => {
    if (amount === "" || amount === "0" || withdrawStep === "Ready") {
      setError(undefined)
      return
    }

    setError(SDK_ERRORS_MAPPING.queueWithdrawal[withdrawStep])
  }, [amount, withdrawStep])

  useEffect(() => {
    if (isMobileOpen) {
      modal.setFlowStep(ModalSteps.gettingValues)
    }
  }, [isMobileOpen])

  const handleModalArrowClick = () => {
    if (modal.gettingValueStep && !!setIsMobileOpen) {
      setIsMobileOpen(false)
    }
    modal.handleClickBack()
  }

  const handleCloseMobileModal = () => {
    if (setIsMobileOpen) {
      modal.handleCloseModal()
      setIsMobileOpen(false)
    }
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 50
    if (showSuccessPopup) return 100

    return 0
  }

  if (isMobile && isMobileOpen)
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "14px",
            paddingBottom: "12px",
          }}
        >
          <TransactionHeader
            label={t("lenderMarketDetails.transactions.withdraw.modal.title")}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : handleModalArrowClick
            }
            crossOnClick={handleCloseMobileModal}
            progress={progressAmount()}
          />

          <Box
            sx={{
              padding: "32px 20px 0",
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.white,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="text2" lineHeight="24px">
              Choose amount of tokens
            </Typography>

            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              lineHeight="24px"
            >
              Available to withdraw{" "}
              <Typography
                variant="text3"
                lineHeight="24px"
                color={COLORS.ultramarineBlue}
              >
                {`${formatTokenWithCommas(marketAccount.marketBalance)} ${
                  market.underlyingToken.symbol
                }`}
              </Typography>
            </Typography>

            <NumberTextField
              label={`Up to ${formatTokenWithCommas(
                marketAccount.marketBalance,
              )} ${market.underlyingToken.symbol}`}
              size="medium"
              style={{
                width: "100%",
                marginTop: "12px",
                marginBottom: "24px",
              }}
              value={amount}
              onChange={handleAmountChange}
              endAdornment={
                <TextfieldButton
                  buttonText="Max"
                  onClick={handleClickMaxAmount}
                />
              }
              error={!!error}
              helperText={error}
            />
          </Box>

          <TxModalFooter
            mainBtnText={t(
              "lenderMarketDetails.transactions.withdraw.modal.buttons.confirm",
            )}
            mainBtnOnClick={handleWithdraw}
            disableMainBtn={disableWithdraw}
            hideButtons={!showForm}
          />
        </Box>

        <Dialog
          open={isPending || showErrorPopup || showSuccessPopup}
          sx={{
            backdropFilter: "blur(10px)",

            "& .MuiDialog-paper": {
              height: "353px",
              width: "100%",
              border: "none",
              borderRadius: "20px",
              padding: "24px 0",
              margin: "auto 0 4px",
            },
          }}
        >
          {isPending && <LoadingModal txHash={txHash} />}
          {showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={handleCloseMobileModal}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal onClose={handleCloseMobileModal} txHash={txHash} />
          )}
        </Dialog>
      </>
    )

  return (
    <>
      <Button
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        onClick={handleOpenModal}
        disabled={notMature}
      >
        {notMature
          ? t("lenderMarketDetails.transactions.withdraw.buttonLocked")
          : t("lenderMarketDetails.transactions.withdraw.button")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <>
            <TxModalHeader
              title={t("lenderMarketDetails.transactions.withdraw.modal.title")}
              arrowOnClick={
                modal.hideArrowButton || !showForm
                  ? null
                  : modal.handleClickBack
              }
              crossOnClick={
                modal.hideCrossButton ? null : modal.handleCloseModal
              }
            />

            <Box width="100%" height="100%" padding="0 24px">
              <ModalDataItem
                title={t(
                  "lenderMarketDetails.transactions.withdraw.modal.available",
                )}
                value={`${formatTokenWithCommas(marketAccount.marketBalance)} ${
                  market.underlyingToken.symbol
                }`}
                containerSx={{
                  padding: "0 12px",
                  margin: "16px 0 20px",
                }}
              />

              <NumberTextField
                label={`Up to ${formatTokenWithCommas(
                  marketAccount.marketBalance,
                )} ${market.underlyingToken.symbol}`}
                size="medium"
                style={{ width: "100%" }}
                value={amount}
                onChange={handleAmountChange}
                endAdornment={
                  <TextfieldButton
                    buttonText="Max"
                    onClick={handleClickMaxAmount}
                  />
                }
                error={!!error}
                helperText={error}
              />
            </Box>
          </>
        )}

        {isPending && <LoadingModal txHash={txHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={modal.handleCloseModal}
            txHash={txHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal onClose={modal.handleCloseModal} txHash={txHash} />
        )}

        <TxModalFooter
          mainBtnText={t(
            "lenderMarketDetails.transactions.withdraw.modal.buttons.confirm",
          )}
          mainBtnOnClick={handleWithdraw}
          disableMainBtn={disableWithdraw}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
