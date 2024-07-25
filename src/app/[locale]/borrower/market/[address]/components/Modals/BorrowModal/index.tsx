import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"

import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

import { BorrowModalProps } from "./interface"
import { useBorrow } from "../../../hooks/useBorrow"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"
import { ModalSteps, useApprovalModal } from "../hooks/useApprovalModal"
import { TxModalDialog, TxModalInfoItem, TxModalInfoTitle } from "../style"

export const BorrowModal = ({
  market,
  marketAccount,
  disableBorrowBtn,
}: BorrowModalProps) => {
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState("")

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { mutate, isSuccess, isError, isPending } = useBorrow(
    marketAccount,
    setTxHash,
  )

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleBorrow = () => {
    modal.setFlowStep(ModalSteps.approved)
  }

  const handleConfirm = () => {
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

  const underlyingBorrowAmount = amount
    ? marketAccount.market.underlyingToken.parseAmount(amount)
    : marketAccount.market.underlyingToken.parseAmount(0)

  const leftBorrowAmount = market.borrowableAssets.sub(underlyingBorrowAmount)

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(market.secondsBeforeDelinquency * 1000, {
          round: true,
          largest: 1,
        })
      : ""

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableBorrow =
    market.isClosed ||
    market.borrowableAssets.eq(0) ||
    underlyingBorrowAmount.gt(market.borrowableAssets) ||
    underlyingBorrowAmount.eq(0)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  return (
    <>
      <Button
        onClick={modal.handleOpenModal}
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        disabled={disableBorrowBtn}
      >
        Borrow
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Borrow"
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="0 24px">
            {modal.approvedStep && (
              <Box sx={TxModalInfoItem} marginBottom="8px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  Borrow Sum
                </Typography>
                <Typography variant="text3">
                  {amount} {market.underlyingToken.symbol}
                </Typography>
              </Box>
            )}

            <Box sx={TxModalInfoItem} marginBottom="8px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                Available to Borrow {modal.approvedStep && "after transaction"}
              </Typography>
              <Typography variant="text3">
                {formatTokenWithCommas(
                  modal.approvedStep
                    ? leftBorrowAmount
                    : marketAccount.market.borrowableAssets,
                  {
                    withSymbol: true,
                  },
                )}
              </Typography>
            </Box>

            <Box sx={TxModalInfoItem} marginBottom="20px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                Interest Remaining
              </Typography>
              <Typography variant="text3">{remainingInterest}</Typography>
            </Box>

            {!modal.approvedStep && (
              <NumberTextField
                label={`Up to ${formatTokenWithCommas(
                  marketAccount.market.borrowableAssets,
                )}`}
                size="medium"
                style={{ width: "100%" }}
                value={amount}
                onChange={handleAmountChange}
                endAdornment={
                  <TextfieldChip
                    text={market.underlyingToken.symbol}
                    size="small"
                  />
                }
              />
            )}
          </Box>
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
          mainBtnText={modal.approvedStep ? "Confirm" : "Borrow"}
          mainBtnOnClick={modal.approvedStep ? handleConfirm : handleBorrow}
          disableMainBtn={disableBorrow}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
