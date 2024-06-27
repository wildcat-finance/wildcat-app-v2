import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, Tab, Tabs, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import {
  TxModalDialog,
  TxModalInfoItem,
  TxModalInfoTitle,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { useRepay } from "@/app/[locale]/borrower/market/[address]/hooks/useRepay"
import { NumberTextField } from "@/components/NumberTextfield"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

export type RepayModalProps = {
  marketAccount: MarketAccount
  disableRepayBtn: boolean
}

export const RepayModal = ({
  marketAccount,
  disableRepayBtn,
}: RepayModalProps) => {
  const { market } = marketAccount

  const {
    mutate: repay,
    isPending: isRepaying,
    isSuccess: isRepaid,
    isError: isRepayError,
  } = useRepay(marketAccount)

  const {
    mutate: approve,
    isPending: isApproving,
    isSuccess: isApproved,
    isError: isApproveError,
  } = useApprove(market.underlyingToken, market)

  const [amount, setAmount] = useState("")

  const repayTokenAmount = useMemo(
    () => market.underlyingToken.parseAmount(amount || "0"),
    [amount],
  )

  const handleApprove = () => {
    approve(repayTokenAmount)
  }

  const handleRepay = () => {
    repay(repayTokenAmount)
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

  const showForm = !(isRepaying || showSuccessPopup || showErrorPopup)

  const disableApprove = amount === "" || isApproved || isApproving

  const disableRepay =
    amount === "" || !isApproved || isApproveError || isApproving

  useEffect(() => {
    if (isRepayError) {
      setShowErrorPopup(true)
    }
    if (isRepaid) {
      setShowSuccessPopup(true)
    }
  }, [isRepayError, isRepaid])

  const [type, setType] = React.useState<"sum" | "days">("sum")

  const handleChangeTabs = (
    event: React.SyntheticEvent,
    newType: "sum" | "days",
  ) => {
    setType(newType)
  }

  return (
    <>
      <Button
        onClick={modal.handleOpenModal}
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        disabled={disableRepayBtn}
      >
        Repay
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isRepaying ? undefined : modal.handleCloseModal}
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
            <Tabs
              value={type}
              onChange={handleChangeTabs}
              aria-label="repay type"
              className="contained"
              sx={{
                width: "100%",
                marginBottom: "24px",
              }}
            >
              <Tab
                value="sum"
                label="Sum"
                className="contained"
                sx={{ width: "196px" }}
              />
              <Tab
                value="days"
                label="Days*"
                className="contained"
                sx={{ width: "196px" }}
              />
            </Tabs>

            {modal.approvedStep && (
              <Box sx={TxModalInfoItem} padding="0 16px" marginBottom="8px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  Repay Sum
                </Typography>
                <Typography variant="text3">
                  {amount} {market.underlyingToken.symbol}
                </Typography>
              </Box>
            )}

            <Box sx={TxModalInfoItem} padding="0 16px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                Available to repay {modal.approvedStep && "after transaction"}
              </Typography>
              <Typography variant="text3">
                {formatTokenWithCommas(market.outstandingDebt, {
                  withSymbol: true,
                })}
              </Typography>
            </Box>

            {!modal.approvedStep && (
              <NumberTextField
                style={{ width: "100%", marginTop: "20px" }}
                value={amount}
                onChange={handleAmountChange}
              />
            )}
          </Box>
        )}

        {isRepaying && <LoadingModal />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={() => console.log()}
            onClose={modal.handleCloseModal}
          />
        )}
        {showSuccessPopup && <SuccessModal onClose={modal.handleCloseModal} />}

        <TxModalFooter
          mainBtnText="Repay"
          secondBtnText="Approve"
          mainBtnOnClick={handleRepay}
          secondBtnOnClick={handleApprove}
          disableMainBtn={disableRepay}
          disableSecondBtn={disableApprove}
          secondBtnLoading={isApproving}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
