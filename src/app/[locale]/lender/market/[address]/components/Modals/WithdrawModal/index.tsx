import { ChangeEvent, useEffect, useMemo, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { useWithdraw } from "@/app/[locale]/lender/market/[address]/hooks/useWithdraw"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { WithdrawModalProps } from "./interface"

export const WithdrawModal = ({ marketAccount }: WithdrawModalProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

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

  return (
    <>
      <Button
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        onClick={handleOpenModal}
      >
        {t("lenderMarketDetails.transactions.withdraw.button")}
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
