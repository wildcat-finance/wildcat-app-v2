import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { minTokenAmount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useBorrow } from "@/app/[locale]/borrower/market/[address]/hooks/useBorrow"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

import { ForceBuyBackModalProps } from "./interface"
import { TxModalDialog, TxModalInfoItem, TxModalInfoTitle } from "./style"
import { useForceBuyBack } from "../../../hooks/useForceBuyBack"

export const ForceBuyBackModal = ({
  market,
  marketAccount,
  lender,
  lenderName,
  disableForceBuyBackButton,
}: ForceBuyBackModalProps) => {
  const { t } = useTranslation()
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { mutate, isSuccess, isError, isPending } = useForceBuyBack(
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
    mutate({ amount, lender: lender.address })
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

  const buyBackAmount = amount
    ? marketAccount.market.underlyingToken.parseAmount(amount)
    : marketAccount.market.underlyingToken.parseAmount(0)

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableForceBuyBack =
    !market.hooksConfig?.allowForceBuyBacks ||
    market.willBeDelinquent ||
    market.isDelinquent ||
    buyBackAmount.gt(marketAccount.underlyingBalance)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  const maximum = lender.marketBalance
    ? minTokenAmount(marketAccount.underlyingBalance, lender.marketBalance)
    : market.underlyingToken.parseAmount(0)

  return (
    <>
      <Button
        onClick={modal.handleOpenModal}
        variant="contained"
        size="small"
        disabled={disableForceBuyBackButton}
      >
        {t("borrowerMarketDetails.authorisedLenders.buttons.forceBuyBack")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("borrowerMarketDetails.modals.forceBuyBack.title")}
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
                  {t(
                    "borrowerMarketDetails.modals.forceBuyBack.repurchaseAmount",
                  )}
                </Typography>
                <Typography variant="text3">
                  {amount} {market.underlyingToken.symbol}
                </Typography>
              </Box>
            )}

            <Box sx={TxModalInfoItem} marginBottom="8px" flexDirection="column">
              <Typography variant="text3">
                {t("borrowerMarketDetails.modals.forceBuyBack.from")}
              </Typography>
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {lenderName ?? lender.address}
              </Typography>
            </Box>

            <Box sx={TxModalInfoItem} marginBottom="8px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {t("borrowerMarketDetails.modals.forceBuyBack.description")}
              </Typography>
            </Box>

            {!modal.approvedStep && (
              <NumberTextField
                label={`Up to ${formatTokenWithCommas(maximum)}`}
                helperText={
                  buyBackAmount.gt(maximum)
                    ? `Please, input amount under ${formatTokenWithCommas(
                        lender.marketBalance,
                        { withSymbol: true },
                      )}`
                    : ""
                }
                error={buyBackAmount.gt(maximum)}
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
          mainBtnText={modal.approvedStep ? "Confirm" : "Buy Back"}
          mainBtnOnClick={modal.approvedStep ? handleConfirm : handleBorrow}
          disableMainBtn={disableForceBuyBack}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
