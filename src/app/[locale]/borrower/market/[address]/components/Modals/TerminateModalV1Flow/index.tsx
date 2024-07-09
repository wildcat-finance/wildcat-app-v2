import React, { useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { minTokenAmount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { TerminateModalV1FlowProps } from "./interface"
import {
  RepayedModalContainer,
  RepayedTypoContainer,
  TerminateAlertContainer,
  TerminateDetailsContainer,
  TerminateDialogContainer,
  TerminateTotalContainer,
} from "./style"
import { TerminateModalSteps, useTerminateModal } from "./useTerminateModal"
import { useApprove } from "../../../hooks/useGetApproval"
import { useGetWithdrawals } from "../../../hooks/useGetWithdrawals"
import { useProcessUnpaidWithdrawalBatch } from "../../../hooks/useProcessUnpaidWithdrawalBatch"
import { useTerminateMarket } from "../../../hooks/useTerminateMarket"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"

export const TerminateModalV1Flow = ({
  marketAccount,
  isOpen,
  setIsOpen,
}: TerminateModalV1FlowProps) => {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const modal = useTerminateModal(
    isOpen,
    setIsOpen,
    setShowSuccessPopup,
    setShowErrorPopup,
  )

  const { market } = marketAccount
  const { data: withdrawals } = useGetWithdrawals(market)

  const {
    mutateAsync: approve,
    isPending: isApproving,
    isSuccess: isApproved,
    isError: isApproveError,
  } = useApprove(market.underlyingToken, market)

  const {
    mutateAsync: repayAndProcess,
    isPending: isProcessing,
    isSuccess: isProcessed,
    isError: IsProcessedError,
  } = useProcessUnpaidWithdrawalBatch(marketAccount)

  const {
    mutateAsync: terminate,
    isPending: isTerminating,
    isSuccess: isTerminated,
    isError: isTerminatedError,
  } = useTerminateMarket(marketAccount)

  const getMarketValues = () => {
    const values = []
    if (market) {
      // withdrawals
      const expiredTotalAmount = withdrawals.expiredWithdrawalsTotalOwed
      const activeTotalAmount = withdrawals.activeWithdrawalsTotalOwed
      const totalAmount = expiredTotalAmount.add(activeTotalAmount)
      values.push({
        name: "Withdrawal Request",
        value: formatTokenWithCommas(totalAmount, { withSymbol: true }),
      })

      // TODO get remaining loan and interest
      values.push(
        {
          name: "Remaining Loan",
          value: formatTokenWithCommas(market.outstandingDebt, {
            withSymbol: true,
          }),
        },
        { name: "Remaining Interest", value: "0 ETH" },
      )

      // protocol fees
      if (market?.totalProtocolFeesAccrued)
        values.push({
          name: "Protocol Fees",
          value: formatTokenWithCommas(market?.totalProtocolFeesAccrued, {
            withSymbol: true,
          }),
        })
      else
        values.push({
          name: "Protocol Fees",
          value: formatTokenWithCommas(
            new TokenAmount(BigNumber.from(0), market.underlyingToken),
            { withSymbol: true },
          ),
        })
    }
    return values
  }

  const marketValues = getMarketValues()

  const total = marketValues.reduce(
    (accumulator, current) => accumulator + parseFloat(current.value),
    0,
  )

  let repayedModalStepTypo = {
    title: "",
    subtitle: "",
  }

  if (isProcessed) {
    repayedModalStepTypo = {
      title: `${total} ${market.underlyingToken.symbol} was successfully repaid.`,
      subtitle: "Any other message. You can close the window.",
    }
  } else if (IsProcessedError) {
    repayedModalStepTypo = {
      title: `${total} ${market.underlyingToken.symbol} wasn't repaid.`,
      subtitle: "Explanatory message about the problem.",
    }
  }

  const terminateMarketStep = marketAccount.checkCloseMarketStep()

  const handleApprove = () => {
    if (terminateMarketStep?.status === "InsufficientAllowance") {
      approve(terminateMarketStep.remainder)
        .then(() => modal.setFlowStep(TerminateModalSteps.approved))
        .catch((err) => console.log(err))
    }
  }

  const handleRepay = () => {
    const { length } = market.unpaidWithdrawalBatchExpiries
    const repayAmount = minTokenAmount(
      market.outstandingDebt,
      market.underlyingToken.getAmount(marketAccount.underlyingApproval),
    )
    modal.setFlowStep(TerminateModalSteps.repayLoading)
    repayAndProcess({
      tokenAmount: repayAmount,
      maxBatches: length,
    })
      .catch((err) => console.log(err))
      .finally(() => modal.setFlowStep(TerminateModalSteps.repayed))
  }

  const handleTerminateMarket = () => {
    modal.setFlowStep(TerminateModalSteps.terminateLoading)
    terminate()
      .catch((err) => console.log(err))
      .finally(() => modal.setFlowStep(TerminateModalSteps.final))
  }

  const disableApprove =
    isApproved || isApproving || terminateMarketStep?.status === "Ready"

  const disableRepay =
    terminateMarketStep?.status === "InsufficientAllowance" ||
    isApproveError ||
    isApproving

  const IsTxApproved = isApproved || terminateMarketStep?.status === "Ready"

  const isLoading = isProcessing || isTerminating

  const showTerminateForm = !(
    modal.repayedStep ||
    isProcessing ||
    isTerminating ||
    showSuccessPopup ||
    showErrorPopup
  )

  const showRepayedPopup = !(
    modal.gettingValueStep ||
    modal.approvedStep ||
    isProcessing ||
    isTerminating ||
    showSuccessPopup ||
    showErrorPopup
  )

  useEffect(() => {
    if (isTerminatedError) {
      setShowErrorPopup(true)
    }
    if (isTerminated) {
      setShowSuccessPopup(true)
    }
  }, [isTerminatedError, isTerminated])

  return (
    <Dialog
      open={modal.isModalOpen}
      onClose={modal.handleCloseModal}
      PaperProps={{
        sx: TerminateDialogContainer,
      }}
    >
      {(showTerminateForm || showRepayedPopup) && (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={modal.hideArrowButton ? null : modal.handleClickBack}
          crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
        />
      )}

      {showTerminateForm && (
        <Box width="100%" height="100%" padding="0 24px">
          <Box sx={TerminateAlertContainer}>
            <Typography color={COLORS.blueRibbon} variant="text3">
              You should repay remaining debt before market termination.
            </Typography>
            <Typography color={COLORS.blueRibbon} variant="text3">
              Learn more about this.
            </Typography>
          </Box>

          <Box sx={TerminateDetailsContainer}>
            {marketValues.map((value) => (
              <Box
                key={value.name}
                sx={{ display: "flex", justifyContent: "space-between" }}
              >
                <Typography color={COLORS.santasGrey} variant="text3">
                  {value.name}
                </Typography>
                <Typography variant="text3" noWrap>
                  {value.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={TerminateTotalContainer}>
            <Typography variant="text1">Total</Typography>
            <Typography variant="text1" noWrap>
              {total} {market.underlyingToken.symbol}
            </Typography>
          </Box>
        </Box>
      )}

      {showRepayedPopup && (
        <>
          <Box width="100%" height="100%" sx={RepayedModalContainer}>
            <Box sx={RepayedTypoContainer}>
              <Typography variant="text1">
                {repayedModalStepTypo.title}
              </Typography>
              <Typography
                variant="text3"
                sx={{
                  color: COLORS.santasGrey,
                  width: "250px",
                  textAlign: "center",
                }}
              >
                {repayedModalStepTypo.subtitle}
              </Typography>
            </Box>
          </Box>

          <Box padding="0 24px">
            <Button
              variant="contained"
              size="large"
              sx={{ marginTop: "auto" }}
              onClick={isProcessed ? handleTerminateMarket : handleRepay}
              fullWidth
            >
              {isProcessed ? "Terminate Market" : "Try Again"}
            </Button>
          </Box>
        </>
      )}

      {isLoading && <LoadingModal />}
      {showSuccessPopup && !isLoading && (
        <SuccessModal onClose={modal.handleCloseModal} />
      )}
      {showErrorPopup && !isLoading && (
        <ErrorModal
          onTryAgain={handleTerminateMarket}
          onClose={modal.handleCloseModal}
        />
      )}

      <TxModalFooter
        mainBtnText="Repay"
        secondBtnText={IsTxApproved ? "Approved" : "Approve"}
        mainBtnOnClick={handleRepay}
        secondBtnOnClick={handleApprove}
        disableMainBtn={disableRepay}
        disableSecondBtn={disableApprove}
        secondBtnLoading={isApproving}
        hideButtons={!showTerminateForm}
      />
    </Dialog>
  )
}
