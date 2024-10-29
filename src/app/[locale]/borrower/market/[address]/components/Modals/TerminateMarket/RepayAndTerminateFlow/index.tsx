import React, { useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { minTokenAmount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { useProcessUnpaidWithdrawalBatch } from "@/app/[locale]/borrower/market/[address]/hooks/useProcessUnpaidWithdrawalBatch"
import { LinkGroup } from "@/components/LinkComponent"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RepayAndTerminateFlowProps } from "./interface"
import {
  RepayedModalContainer,
  RepayedTypoContainer,
  TerminateAlertContainer,
  TerminateDetailsContainer,
  TerminateDialogContainer,
  TerminateTotalContainer,
} from "./style"
import { TerminateModalSteps, useTerminateModal } from "./useTerminateModal"

export const RepayAndTerminateFlow = ({
  marketAccount,
  terminateFunc,
  isTerminating,
  isOpen,
  onClose,
  successPopup,
  errorPopup,
  terminateTxHash,
}: RepayAndTerminateFlowProps) => {
  const { t } = useTranslation()
  const [approveTxHash, setApproveTxHash] = useState<string | undefined>("")
  const [repayTxHash, setRepayTxHash] = useState<string | undefined>("")
  const modal = useTerminateModal()

  const isModalOpen = isOpen && !modal.closedModalStep

  const { market } = marketAccount
  const { data: withdrawals } = useGetWithdrawals(market)

  const {
    mutateAsync: approve,
    isPending: isApproving,
    isError: isApproveError,
  } = useApprove(market.underlyingToken, market, setApproveTxHash)

  const {
    mutateAsync: repayAndProcess,
    isPending: isProcessing,
    isSuccess: isProcessed,
    isError: IsProcessedError,
  } = useProcessUnpaidWithdrawalBatch(marketAccount, setRepayTxHash)

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
          value: "0 ETH",
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
    terminateFunc()
      .catch((err) => console.log(err))
      .finally(() => modal.setFlowStep(TerminateModalSteps.final))
  }

  const disableApprove =
    isApproving ||
    terminateMarketStep?.status === "UnpaidWithdrawalBatches" ||
    terminateMarketStep?.status === "Ready"

  const disableRepay =
    terminateMarketStep?.status === "InsufficientAllowance" ||
    isApproveError ||
    isApproving

  const IsTxApproved =
    terminateMarketStep?.status === "Ready" ||
    terminateMarketStep?.status === "UnpaidWithdrawalBatches"

  const isLoading = isProcessing || isTerminating

  const showTerminateForm = !(
    modal.closedModalStep ||
    modal.repayedStep ||
    isProcessing ||
    isTerminating ||
    successPopup ||
    errorPopup
  )

  const showRepayedPopup = !(
    modal.closedModalStep ||
    modal.gettingValueStep ||
    modal.approvedStep ||
    isProcessing ||
    isTerminating ||
    successPopup ||
    errorPopup
  )

  useEffect(() => {
    if (isOpen) {
      modal.setFlowStep(TerminateModalSteps.gettingValues)
    } else {
      modal.setFlowStep(TerminateModalSteps.closedModal)
    }
  }, [isOpen])

  return (
    <Dialog
      open={isModalOpen}
      onClose={onClose}
      PaperProps={{
        sx: TerminateDialogContainer,
      }}
    >
      {(showTerminateForm || showRepayedPopup) && (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={modal.hideArrowButton ? null : modal.handleClickBack}
          crossOnClick={modal.hideCrossButton ? null : onClose}
        />
      )}

      {showTerminateForm && (
        <Box width="100%" height="100%" padding="0 24px">
          <Box sx={TerminateAlertContainer}>
            <Typography color={COLORS.blueRibbon} variant="text3">
              {t("borrowerMarketDetails.modals.terminate.repayRemaining")}
            </Typography>
            <Typography color={COLORS.blueRibbon} variant="text3">
              {t("borrowerMarketDetails.modals.terminate.learnMore")}
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
            <Typography variant="text1">
              {t("borrowerMarketDetails.modals.terminate.total")}
            </Typography>
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

          {repayTxHash !== "" && modal.repayedStep && (
            <LinkGroup
              type="etherscan"
              linkValue={`${EtherscanBaseUrl}/tx/${repayTxHash}`}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

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

      {isLoading && <LoadingModal txHash={terminateTxHash} />}
      {successPopup && !isLoading && (
        <SuccessModal onClose={onClose} txHash={terminateTxHash} />
      )}
      {errorPopup && !isLoading && (
        <ErrorModal
          onTryAgain={handleTerminateMarket}
          onClose={onClose}
          txHash={terminateTxHash}
        />
      )}

      {approveTxHash !== "" && modal.approvedStep && (
        <LinkGroup
          type="etherscan"
          linkValue={`${EtherscanBaseUrl}/tx/${approveTxHash}`}
          groupSX={{ padding: "8px", marginBottom: "8px" }}
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
