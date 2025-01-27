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
import { RepayStatus, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

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
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RepayModalProps } from "./interface"
import { DaysSubtitle, PenaltyRepayBtn, PenaltyRepayBtnIcon } from "./style"

const SECONDS_IN_DAY = 24 * 60 * 60

export const RepayModal = ({
  buttonType = "marketHeader",
  marketAccount,
  disableRepayBtn,
}: RepayModalProps) => {
  const { t } = useTranslation()
  const [type, setType] = React.useState<"sum" | "days">("sum")

  const [amount, setAmount] = useState("")
  const [days, setDays] = useState("")
  const [maxRepayAmount, setMaxRepayAmount] = useState<TokenAmount>()
  const [finalRepayAmount, setFinalRepayAmount] = useState<TokenAmount>()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>("")

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
  } = useRepay(marketAccount, setTxHash, true)
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

  const isRepayByDays = type === "days"

  const repayTokenAmount = useMemo(
    () => market.underlyingToken.parseAmount(amount.replace(/,/g, "") || "0"), // delete commas
    [amount],
  )

  const repayDaysAmount = market.repayRequiredForDuration(
    Number(days) * SECONDS_IN_DAY,
  )

  const repayAmount = isRepayByDays
    ? repayDaysAmount
    : maxRepayAmount || repayTokenAmount

  const repayStep = marketAccount.previewRepay(
    finalRepayAmount || repayAmount,
  ).status

  // const getRepayStep = (inputAmount: TokenAmount) => {
  //   if (market.isClosed) return { status: RepayStatus.MarketClosed }
  //   if (inputAmount.gt(marketAccount.underlyingBalance)) {
  //     return { status: RepayStatus.InsufficientBalance }
  //   }
  //   if (marketAccount.isApprovedFor(inputAmount)) {
  //     return { status: RepayStatus.InsufficientAllowance }
  //   }
  //   if (inputAmount.gt(market.outstandingDebt.raw)) {
  //     return { status: RepayStatus.ExceedsOutstandingDebt }
  //   }
  //   return { status: RepayStatus.Ready }
  // }
  //
  // const repayStep = getRepayStep(finalRepayAmount || repayAmount).status

  const handleRepay = () => {
    setTxHash("")
    repay(finalRepayAmount || repayAmount)
  }

  const handleApprove = () => {
    setTxHash("")
    if (repayStep === "InsufficientAllowance") {
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
    repayStep === "Ready" ||
    repayStep === "InsufficientBalance" ||
    isApproving

  const disableRepay =
    market.isClosed ||
    repayAmount.raw.isZero() ||
    repayStep === "InsufficientAllowance" ||
    repayStep === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    repayStep === "Ready" && !repayAmount.raw.isZero() && !isApproving

  const showForm = !(isRepaying || showSuccessPopup || showErrorPopup)

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(market.secondsBeforeDelinquency * 1000, {
          round: true,
          largest: 1,
        })
      : ""

  const amountInputLabel = isRepayByDays
    ? `${t(
        "borrowerMarketDetails.modals.repay.interestRemaining",
      )} ${remainingInterest}`
    : `${t("borrowerMarketDetails.modals.repay.upTo")} ${formatTokenWithCommas(
        market.outstandingDebt,
        {
          withSymbol: true,
        },
      )}`

  const amountInputValue = isRepayByDays ? days : amount

  const amountInputOnChange = isRepayByDays
    ? handleDaysChange
    : handleAmountChange

  const amountInputAdornment = isRepayByDays ? (
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

  const [repayError, setRepayError] = useState<string | undefined>()

  useEffect(() => {
    if (
      !isRepayByDays &&
      (amount === "" || amount === "0" || repayStep === "Ready")
    ) {
      setRepayError(undefined)
      return
    }

    if (
      isRepayByDays &&
      (days === "" || days === "0" || repayStep === "Ready")
    ) {
      setRepayError(undefined)
      return
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    setRepayError(SDK_ERRORS_MAPPING.repay[repayStep])
  }, [repayStep, amount])

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
          {t("borrowerMarketDetails.modals.repay.repay")}
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
          {t("borrowerMarketDetails.modals.repay.repay")}
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

            {isRepayByDays && modal.gettingValueStep && (
              <Typography variant="text4" sx={DaysSubtitle}>
                {t("borrowerMarketDetails.modals.repay.daysSubtitle")}
              </Typography>
            )}

            {modal.approvedStep && (
              <Box sx={TxModalInfoItem} padding="0 16px" marginBottom="8px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  {t("borrowerMarketDetails.modals.repay.repaySum")}
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
                {t("borrowerMarketDetails.modals.repay.repaySum")}{" "}
                {modal.approvedStep &&
                  t("borrowerMarketDetails.modals.repay.afterTransaction")}
              </Typography>
              <Typography variant="text3">
                {formatTokenWithCommas(
                  (() => {
                    if (modal.approvedStep) {
                      if (repayTokenAmount.raw >= market.outstandingDebt.raw) {
                        return new TokenAmount(
                          BigNumber.from(0),
                          market.underlyingToken,
                        )
                      }
                      return market.outstandingDebt.sub(
                        maxRepayAmount || repayTokenAmount,
                      )
                    }
                    return market.outstandingDebt
                  })(),
                  { withSymbol: true },
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
                max={type === "days" ? 100000000 : undefined}
                // decimalScale={2}
                error={!!repayError}
                helperText={repayError}
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
          secondBtnText={
            isApprovedButton
              ? t("borrowerMarketDetails.modals.repay.approved")
              : t("borrowerMarketDetails.modals.repay.approve")
          }
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
