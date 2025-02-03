import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
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
import { formatTokenWithCommas } from "@/utils/formatters"

export const MinimumDepositModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [amount, setAmount] = useState("")
  const [minDepositError, setMinDepositError] = useState<string | undefined>()
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

  // todo: write hook for mutation

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleConfirm = () => {
    console.log("test")
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const disableMinDeposit = market.isClosed

  const disableConfirm = amount === "" || !!minDepositError

  const maxCapacity = Number(
    parseFloat(market.maxTotalSupply.format(market.maxTotalSupply.decimals)),
  )

  const isPending = false
  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  useEffect(() => {
    if (Number(amount) > maxCapacity) {
      setMinDepositError("Minimum deposit must be less than market capacity")
    } else {
      setMinDepositError(undefined)
    }
  }, [amount, maxCapacity])

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={modal.handleOpenModal}
        disabled={disableMinDeposit}
      >
        Adjust Minimum Deposit
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Adjust Minimum Deposit"
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("borrowerMarketDetails.modals.capacity.current")}
              value={`${formatTokenWithCommas(market.maxTotalSupply)} ${
                market.underlyingToken.symbol
              }`}
              containerSx={{
                marginBottom: "8px",
              }}
            />

            <ModalDataItem
              title="Current Minimum Deposit"
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
              label="Enter a new minimum deposit"
              size="medium"
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              error={!!minDepositError}
              helperText={minDepositError}
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
