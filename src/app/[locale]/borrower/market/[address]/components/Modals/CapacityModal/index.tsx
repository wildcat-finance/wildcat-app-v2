import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

import { useSetMaxTotalSupply } from "../../../hooks/useCapacity"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"
import { useApprovalModal } from "../hooks/useApprovalModal"
import { TxModalDialog, TxModalInfoItem, TxModalInfoTitle } from "../style"

export const CapacityModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
  )

  const { t } = useTranslation()

  const { market } = marketAccount

  const { mutate, isPending, isSuccess, isError } =
    useSetMaxTotalSupply(marketAccount)

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleConfirm = () => {
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableConfirm = amount === ""

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
        variant="outlined"
        color="secondary"
        size="small"
        onClick={modal.handleOpenModal}
      >
        {t("borrowerMarketDetails.buttons.capacity")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Adjust Capacity"
            tooltip="TBD"
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="0 24px">
            <Box sx={TxModalInfoItem} marginBottom="20px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                Current capacity
              </Typography>
              <Typography variant="text3">{`${formatTokenWithCommas(
                market.maxTotalSupply,
              )} ${market.underlyingToken.symbol}`}</Typography>
            </Box>

            <NumberTextField
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
          </Box>
        )}

        {isPending && <LoadingModal />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={modal.handleCloseModal}
          />
        )}
        {showSuccessPopup && <SuccessModal onClose={modal.handleCloseModal} />}

        <TxModalFooter
          mainBtnText="Confirm"
          mainBtnOnClick={handleConfirm}
          disableMainBtn={disableConfirm}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
