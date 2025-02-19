import * as React from "react"
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react"

import { Box, Button, Dialog } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

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

export type DepositModalProps = {
  market: Market
  collateralAsset: string
}

export const DepositModalContract = ({
  market,
  collateralAsset,
}: DepositModalProps) => {
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const isPending = !!0

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const handleConfirm = () => {
    console.log("Test")
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const disableCollateralDeposit = market.isClosed

  // useEffect(() => {
  //   if (isError) {
  //     setShowErrorPopup(true)
  //   }
  //   if (isSuccess) {
  //     setShowSuccessPopup(true)
  //   }
  // }, [isError, isSuccess])

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={modal.handleOpenModal}
        sx={{ height: "fit-content", width: "90px" }}
      >
        Deposit
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={`Deposit for ${market.name}`}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title="Amount Held"
              value={`0 ${collateralAsset}`}
              containerSx={{
                marginBottom: "14px",
              }}
            />

            <NumberTextField
              label="0.0"
              size="medium"
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              endAdornment={
                <TextfieldChip text={collateralAsset} size="small" />
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
          disableMainBtn={disableCollateralDeposit}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
