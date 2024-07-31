import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  SvgIcon,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import {
  TxModalDialog,
  TxModalInfoItem,
  TxModalInfoTitle,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { useRepay } from "@/app/[locale]/borrower/market/[address]/hooks/useRepay"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RepayModalProps } from "./interface"
import { DaysSubtitle, PenaltyRepayBtn, PenaltyRepayBtnIcon } from "./style"

export const RepayModal = ({
  buttonType = "marketHeader",
  marketAccount,
  disableRepayBtn,
}: RepayModalProps) => {
  const [type, setType] = React.useState<"sum" | "days">("sum")

  const [amount, setAmount] = useState("")
  const [days, setDays] = useState("")
  const [maxRepayAmount, setMaxRepayAmount] = useState<TokenAmount>()
  const [finalRepayAmount, setFinalRepayAmount] = useState<TokenAmount>()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState("")

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { market } = marketAccount

  const {
    mutate: repay,
    isPending: isRepaying,
    isSuccess: isRepaid,
    isError: isRepayError,
  } = useRepay(marketAccount, setTxHash)
  const { mutateAsync: approve, isPending: isApproving } = useApprove(
    market.underlyingToken,
    market,
    setTxHash,
  )

  const handleChangeTabs = (
    event: React.SyntheticEvent,
    newType: "sum" | "days",
  ) => {
    setType(newType)
    setAmount("")
    setDays("")
  }

  const handleOpenModal = () => {
    setType("sum")
    setDays("")
    setFinalRepayAmount(undefined)
    modal.handleOpenModal()
  }

  const typeDays = type === "days"

  const repayTokenAmount = useMemo(
    () => market.underlyingToken.parseAmount(amount || "0"),
    [amount],
  )

  const repayDaysAmount = market.repayRequiredForDuration(Number(days) * 86400)

  const repayAmount = typeDays
    ? repayDaysAmount
    : maxRepayAmount || repayTokenAmount

  const repayStep = marketAccount.checkRepayStep(
    finalRepayAmount || repayAmount,
  )

  const handleRepay = () => {
    setTxHash("")
    repay(finalRepayAmount || repayAmount)
  }

  const handleApprove = () => {
    setTxHash("")
    if (repayStep?.status === "InsufficientAllowance") {
      approve(repayAmount).then(() => {
        setFinalRepayAmount(repayAmount)
        modal.setFlowStep(ModalSteps.approved)
      })
    }
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleRepay()
    setShowErrorPopup(false)
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
    setMaxRepayAmount(undefined)
  }

  const handleClickMaxAmount = () => {
    setAmount(formatTokenWithCommas(market.outstandingDebt))
    setMaxRepayAmount(market.outstandingDebt)
  }

  const handleDaysChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setDays(value)
  }

  const disableApprove =
    market.isClosed ||
    repayAmount.raw.isZero() ||
    repayAmount.raw.gt(market.outstandingDebt.raw) ||
    repayStep?.status === "Ready" ||
    repayStep?.status === "InsufficientBalance" ||
    isApproving

  const disableRepay =
    market.isClosed ||
    repayAmount.raw.isZero() ||
    repayAmount.raw.gt(market.outstandingDebt.raw) ||
    repayStep?.status === "InsufficientAllowance" ||
    repayStep?.status === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    repayStep?.status === "Ready" && !repayAmount.raw.isZero()

  const showForm = !(isRepaying || showSuccessPopup || showErrorPopup)

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(market.secondsBeforeDelinquency * 1000, {
          round: true,
          largest: 1,
        })
      : ""

  const amountInputLabel = typeDays
    ? `Interest remaining for ${remainingInterest}`
    : `Up to ${formatTokenWithCommas(market.outstandingDebt, {
        withSymbol: true,
      })}`

  const amountInputValue = typeDays ? days : amount

  const amountInputOnChange = typeDays ? handleDaysChange : handleAmountChange

  const amountInputAdornment = typeDays ? (
    <Typography
      variant="text3"
      color={COLORS.santasGrey}
      sx={{ padding: "0 12px" }}
    >{`~ ${formatTokenWithCommas(repayDaysAmount)} ${
      market.underlyingToken.symbol
    }`}</Typography>
  ) : (
    <TextfieldButton buttonText="Max" onClick={handleClickMaxAmount} />
  )

  useEffect(() => {
    if (isRepayError) {
      setShowErrorPopup(true)
    }
    if (isRepaid) {
      setShowSuccessPopup(true)
    }
  }, [isRepayError, isRepaid])

  return (
    <>
      {buttonType === "marketHeader" && (
        <Button
          onClick={handleOpenModal}
          variant="contained"
          size="large"
          sx={{ width: "152px" }}
          disabled={disableRepayBtn}
        >
          Repay
        </Button>
      )}

      {buttonType === "withdrawalTable" && (
        <Button
          onClick={handleOpenModal}
          variant="contained"
          size="small"
          sx={PenaltyRepayBtn}
          disabled={disableRepayBtn}
        >
          Repay
          <SvgIcon fontSize="tiny" sx={PenaltyRepayBtnIcon}>
            <Arrow />
          </SvgIcon>
        </Button>
      )}

      <Dialog
        open={modal.isModalOpen}
        onClose={isRepaying ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Repay"
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="0 24px">
            {modal.gettingValueStep && (
              <Tabs
                value={type}
                onChange={handleChangeTabs}
                aria-label="repay type"
                className="contained"
                sx={{
                  width: "100%",
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
            )}

            {typeDays && modal.gettingValueStep && (
              <Typography variant="text4" sx={DaysSubtitle}>
                *number of additional days for which you want to cover interest
              </Typography>
            )}

            {modal.approvedStep && (
              <Box sx={TxModalInfoItem} padding="0 16px" marginBottom="8px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  Repay Sum
                </Typography>
                <Typography variant="text3">
                  {formatTokenWithCommas(repayAmount)}{" "}
                  {market.underlyingToken.symbol}
                </Typography>
              </Box>
            )}

            <Box
              sx={TxModalInfoItem}
              marginTop={modal.approvedStep ? "8px" : "24px"}
              padding="0 16px"
            >
              <Typography variant="text3" sx={TxModalInfoTitle}>
                Need to repay {modal.approvedStep && "after transaction"}
              </Typography>
              <Typography variant="text3">
                {formatTokenWithCommas(
                  modal.approvedStep
                    ? market.outstandingDebt.sub(
                        maxRepayAmount || repayTokenAmount,
                      )
                    : market.outstandingDebt,
                  {
                    withSymbol: true,
                  },
                )}
              </Typography>
            </Box>

            {modal.gettingValueStep && (
              <NumberTextField
                label={amountInputLabel}
                size="medium"
                style={{ width: "100%", marginTop: "20px" }}
                value={amountInputValue}
                onChange={amountInputOnChange}
                endAdornment={amountInputAdornment}
                disabled={isApproving}
              />
            )}
          </Box>
        )}

        {isRepaying && <LoadingModal txHash={txHash} />}
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

        {txHash !== "" && showForm && (
          <LinkGroup
            type="etherscan"
            linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
            groupSX={{ padding: "8px", marginBottom: "8px" }}
          />
        )}

        <TxModalFooter
          mainBtnText="Repay"
          secondBtnText={isApprovedButton ? "Approved" : "Approve"}
          secondBtnIcon={isApprovedButton}
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
