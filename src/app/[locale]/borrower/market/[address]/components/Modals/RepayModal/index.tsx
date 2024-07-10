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

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RepayModalProps } from "./interface"
import { DaysSubtitle, PenaltyRepayBtn, PenaltyRepayBtnIcon } from "./style"
import { useApprove } from "../../../hooks/useGetApproval"
import { useRepay } from "../../../hooks/useRepay"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"
import { ModalSteps, useApprovalModal } from "../hooks/useApprovalModal"
import { TxModalDialog, TxModalInfoItem, TxModalInfoTitle } from "../style"

export const RepayModal = ({
  buttonType = "marketHeader",
  marketAccount,
  disableRepayBtn,
}: RepayModalProps) => {
  const [type, setType] = React.useState<"sum" | "days">("sum")
  const [amount, setAmount] = useState("")
  const [days, setDays] = useState("")
  const [maxRepayAmount, setMaxRepayAmount] = useState<TokenAmount>()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
  )

  const { market } = marketAccount

  const {
    mutate: repay,
    isPending: isRepaying,
    isSuccess: isRepaid,
    isError: isRepayError,
  } = useRepay(marketAccount)
  const {
    mutateAsync: approve,
    isPending: isApproving,
    isSuccess: isApproved,
    isError: isApproveError,
  } = useApprove(market.underlyingToken, market)

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

  const repayStep = marketAccount.checkRepayStep(repayAmount)

  const handleRepay = () => {
    repay(repayAmount)
  }

  const handleApprove = () => {
    if (repayStep?.status === "InsufficientAllowance") {
      approve(repayAmount).then(() => modal.setFlowStep(ModalSteps.approved))
    }
  }

  const handleTryAgain = () => {
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
    repayAmount.raw.isZero() ||
    isApproved ||
    isApproving ||
    repayStep?.status === "Ready" ||
    repayStep?.status === "InsufficientBalance"

  const disableRepay =
    market.isClosed ||
    repayAmount.raw.isZero() ||
    repayStep?.status === "InsufficientAllowance" ||
    repayStep?.status === "InsufficientBalance" ||
    isApproveError ||
    isApproving

  console.log(repayStep, "repayStep")

  const IsTxApproved = isApproved || repayStep?.status === "Ready"

  const showForm = !(isRepaying || showSuccessPopup || showErrorPopup)

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(market.secondsBeforeDelinquency * 1000, {
          round: true,
          units: ["d"],
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

            {typeDays && (
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
                  {amount} {market.underlyingToken.symbol}
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

        {isRepaying && <LoadingModal />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={modal.handleCloseModal}
          />
        )}
        {showSuccessPopup && <SuccessModal onClose={modal.handleCloseModal} />}

        <TxModalFooter
          mainBtnText="Repay"
          secondBtnText={IsTxApproved ? "Approved" : "Approve"}
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
