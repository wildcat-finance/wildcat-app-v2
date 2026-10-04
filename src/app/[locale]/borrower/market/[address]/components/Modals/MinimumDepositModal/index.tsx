import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog } from "@mui/material"
import { MarketAccount, SetMinimumDepositStatus } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { useSetMinimumDeposit } from "../../../hooks/useSetMinimumDeposit"

export const MinimumDepositModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const { mutate, isPending, isError, isSuccess } = useSetMinimumDeposit(
    marketAccount,
    setTxHash,
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { t } = useTranslation()

  const { market } = marketAccount

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const preview =
    amount !== ""
      ? marketAccount.previewSetMinimumDeposit(
          market.underlyingToken.parseAmount(amount),
        )
      : undefined

  const handleConfirm = () => {
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const disableMinDeposit = market.isClosed || market.hasFrozenHookParameters

  const disableConfirm =
    disableMinDeposit || preview?.status !== SetMinimumDepositStatus.Ready

  const minimumDepositError =
    preview && preview.status !== SetMinimumDepositStatus.Ready
      ? SDK_ERRORS_MAPPING.setMinimumDeposit[preview.status]
      : undefined

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

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
        disabled={disableMinDeposit}
      >
        {t("marketDetails.borrower.adjustMinimumDeposit")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("marketDetails.borrower.adjustMinimumDeposit")}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("marketDetails.borrower.modals.capacity.current")}
              value={`${formatTokenWithCommas(market.maxTotalSupply)} ${
                market.underlyingToken.symbol
              }`}
              containerSx={{
                marginBottom: "8px",
              }}
            />

            <ModalDataItem
              title={t("marketDetails.borrower.currentMinimumDeposit")}
              value={
                market.hooksConfig?.minimumDeposit
                  ? formatTokenWithCommas(market.hooksConfig?.minimumDeposit, {
                      withSymbol: true,
                    })
                  : "0"
              }
              containerSx={{
                marginBottom: "14px",
              }}
            />

            <NumberTextField
              label={t("marketDetails.borrower.enterNewMinimumDepositAmount")}
              size="medium"
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              error={!!minimumDepositError}
              helperText={minimumDepositError}
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
