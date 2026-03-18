import { ChangeEvent, useEffect, useRef, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog } from "@mui/material"
import {
  MarketAccount,
  SetMinimumDepositPreview,
  SetMinimumDepositStatus,
} from "@wildcatfi/wildcat-sdk"
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
import { createClientFlowSession } from "@/lib/telemetry/clientFlow"
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
  const [preview, setPreview] = useState<SetMinimumDepositPreview | undefined>()
  const flowSessionRef = useRef(createClientFlowSession())

  const { mutate, isPending, isError, isSuccess } = useSetMinimumDeposit(
    marketAccount,
    setTxHash,
    () => flowSessionRef.current.getParentContext(),
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { t } = useTranslation()

  const { market } = marketAccount

  const closeModal = (
    outcome: "cancelled" | "error" | "success" = "cancelled",
  ) => {
    flowSessionRef.current.endFlowSpan(outcome, {
      "flow.outcome": outcome,
    })
    modal.handleCloseModal()
  }

  // todo: write hook for mutation

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)

    const newPreview = marketAccount.previewSetMinimumDeposit(
      marketAccount.market.underlyingToken.parseAmount(value),
    )
    setPreview(newPreview)
  }

  const handleConfirm = () => {
    flowSessionRef.current.startFlowSpan("adjust_minimum_deposit.flow", {
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
    setShowSuccessPopup(false)
  }

  const disableMinDeposit = market.isClosed

  const disableConfirm =
    amount === "" || preview?.status !== SetMinimumDepositStatus.Ready

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

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
        disabled={disableMinDeposit}
      >
        Adjust Minimum Deposit
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : () => closeModal("cancelled")}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Adjust Minimum Deposit"
            arrowOnClick={() => closeModal("cancelled")}
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
              label="Enter New Minimum Deposit Amount"
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
