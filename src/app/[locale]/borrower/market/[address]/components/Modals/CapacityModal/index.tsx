import * as React from "react"
import { ChangeEvent, useEffect, useRef, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
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
import { createClientFlowSession } from "@/lib/telemetry/clientFlow"
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
  const flowSessionRef = useRef(createClientFlowSession())

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
    () => flowSessionRef.current.getParentContext(),
  )

  const closeModal = (
    outcome: "cancelled" | "error" | "success" = "cancelled",
  ) => {
    flowSessionRef.current.endFlowSpan(outcome, {
      "flow.outcome": outcome,
    })
    modal.handleCloseModal()
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleConfirm = () => {
    flowSessionRef.current.startFlowSpan("adjust_capacity.flow", {
      "market.address": market.address,
      "market.chain_id": market.chainId,
      "token.symbol": market.underlyingToken.symbol,
      "token.amount_input": amount,
    })
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableCapacity = market.isClosed

  const disableConfirm = amount === ""

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      flowSessionRef.current.endFlowSpan("success", {
        "flow.outcome": "success",
      })
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
        {t("borrowerMarketDetails.buttons.capacity")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : () => closeModal("cancelled")}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Adjust Capacity"
            tooltip="Increase or decrease the maximum amount of credit extendable within this market."
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={
              modal.hideCrossButton ? null : () => closeModal("cancelled")
            }
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="12px 24px">
            <Box sx={TxModalInfoItem} marginBottom="20px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {t("borrowerMarketDetails.modals.capacity.current")}
              </Typography>
              <Typography variant="text3">{`${formatTokenWithCommas(
                market.maxTotalSupply,
              )} ${market.underlyingToken.symbol}`}</Typography>
            </Box>

            <NumberTextField
              label="Enter a new capacity"
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

        {isPending && <LoadingModal txHash={txHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={() => closeModal("error")}
            txHash={txHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal onClose={() => closeModal("success")} txHash={txHash} />
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
