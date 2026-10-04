import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { MarketAccount, SetMaxTotalSupplyStatus } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import {
  TxModalDialog,
  TxModalInfoItem,
  TxModalInfoTitle,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { useSetMaxTotalSupply } from "@/app/[locale]/borrower/market/[address]/hooks/useCapacity"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const CapacityModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { t } = useTranslation()

  const { market } = marketAccount

  const { mutate, isPending, isSuccess, isError } = useSetMaxTotalSupply(
    marketAccount,
    setTxHash,
  )

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

  const preview =
    amount !== ""
      ? marketAccount.previewSetMaxTotalSupply(
          market.underlyingToken.parseAmount(amount),
        )
      : undefined
  const capacityError =
    preview && preview.status !== SetMaxTotalSupplyStatus.Ready
      ? SDK_ERRORS_MAPPING.setCapacity[preview.status]
      : undefined
  const disableCapacity = market.isClosed || market.hasFrozenHookParameters

  const disableConfirm =
    disableCapacity || preview?.status !== SetMaxTotalSupplyStatus.Ready

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
        disabled={disableCapacity}
      >
        {t("marketDetails.borrower.buttons.capacity")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("marketDetails.borrower.buttons.capacity")}
            tooltip={t(
              "marketDetails.borrower.increaseDecreaseMaximumAmountCredit",
            )}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="12px 24px">
            <Box sx={TxModalInfoItem} marginBottom="20px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {t("marketDetails.borrower.modals.capacity.current")}
              </Typography>
              <Typography variant="text3">{`${formatTokenWithCommas(
                market.maxTotalSupply,
              )} ${market.underlyingToken.symbol}`}</Typography>
            </Box>

            <NumberTextField
              label={t("marketDetails.borrower.enterNewCapacity")}
              size="medium"
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              error={!!capacityError}
              helperText={capacityError}
              endAdornment={
                <TextfieldChip
                  text={market.underlyingToken.symbol}
                  size="small"
                />
              }
            />
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
          mainBtnText="Confirm"
          mainBtnOnClick={handleConfirm}
          disableMainBtn={disableConfirm}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
