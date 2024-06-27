import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useSetMaxTotalSupply } from "@/app/[locale]/borrower/market/[address]/hooks/useCapacity"
import {
  TxModalDialog,
  TxModalInfoItem,
  TxModalInfoTitle,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

export const CapacityModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()

  const { mutate, isPending, isSuccess, isError } =
    useSetMaxTotalSupply(marketAccount)

  const { market } = marketAccount

  const [amount, setAmount] = useState("")

  const handleConfirm = () => {
    mutate(amount)
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
  )

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableConfirm = amount === ""

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

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
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              endAdornment={
                <TextfieldChip text={market.underlyingToken.symbol} />
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
