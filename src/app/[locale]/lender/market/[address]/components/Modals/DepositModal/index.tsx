import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { DepositStatus, Signer, HooksKind } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { LinkGroup } from "@/components/LinkComponent"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EtherscanBaseUrl } from "@/config/network"
import { formatDate } from "@/lib/mla"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { DepositModalProps } from "./interface"
import { useDeposit } from "../../../hooks/useDeposit"

export const DepositModal = ({ marketAccount }: DepositModalProps) => {
  const { t } = useTranslation()

  const { market } = marketAccount

  const [amount, setAmount] = useState("")

  const [depositError, setDepositError] = useState<string | undefined>()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>("")

  const {
    mutate: deposit,
    isPending: isDepositing,
    isSuccess: isDeposed,
    isError: isDepositError,
  } = useDeposit(marketAccount, setTxHash)

  const { mutateAsync: approve, isPending: isApproving } = useApprove(
    market.underlyingToken,
    market,
    setTxHash,
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const depositTokenAmount = useMemo(
    () => marketAccount.market.underlyingToken.parseAmount(amount || "0"),
    [amount],
  )

  const minimumDeposit = market.hooksConfig?.minimumDeposit

  // TODO: remove after fixing previewDeposit in wildcat.ts
  const getDepositStatus = () => {
    const status = marketAccount.depositAvailability
    if (status !== DepositStatus.Ready) return { status }
    if (depositTokenAmount.gt(market.maximumDeposit)) {
      return { status: DepositStatus.ExceedsMaximumDeposit }
    }
    if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
      return { status: DepositStatus.InsufficientBalance }
    }
    if (minimumDeposit && depositTokenAmount.lt(minimumDeposit)) {
      return { status: DepositStatus.BelowMinimumDeposit }
    }
    if (!marketAccount.isApprovedFor(depositTokenAmount)) {
      return { status: DepositStatus.InsufficientAllowance }
    }
    return { status: DepositStatus.Ready }
  }

  const depositStep = getDepositStatus().status

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleDeposit = () => {
    setTxHash("")
    deposit(depositTokenAmount)
  }

  const handleApprove = () => {
    setTxHash("")
    if (depositStep === "InsufficientAllowance") {
      approve(depositTokenAmount).then(() => {
        modal.setFlowStep(ModalSteps.approved)
      })
    }
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleDeposit()
    setShowErrorPopup(false)
  }

  const disableApprove =
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    depositStep === "Ready" ||
    depositStep === "InsufficientBalance" ||
    modal.approvedStep ||
    isApproving ||
    !(market.provider instanceof Signer)

  const disableDeposit =
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    depositStep === "InsufficientAllowance" ||
    depositStep === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    depositStep === "Ready" && !depositTokenAmount.raw.isZero() && !isApproving

  const isFixedTerm = market.isInFixedTerm
  const fixedTermMaturity =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.fixedTermEndTime
      : undefined
  const earlyTermination =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.allowClosureBeforeTerm
      : false
  const earlyMaturity =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.allowTermReduction
      : false

  const showForm = !(isDepositing || showSuccessPopup || showErrorPopup)

  useEffect(() => {
    if (isDepositError) {
      setShowErrorPopup(true)
    }
    if (isDeposed) {
      setShowSuccessPopup(true)
    }
  }, [isDepositError, isDeposed])

  useEffect(() => {
    if (amount === "" || amount === "0" || depositStep === "Ready") {
      setDepositError(undefined)
      return
    }

    setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
  }, [depositStep, amount])

  return (
    <>
      <Button
        onClick={modal.handleOpenModal}
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
      >
        {t("lenderMarketDetails.transactions.deposit.button")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isDepositing ? undefined : modal.handleCloseModal}
        sx={{
          "& .MuiDialog-paper": {
            height: "404px",
            width: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {showForm && (
          <>
            <TxModalHeader
              title={t("lenderMarketDetails.transactions.deposit.modal.title")}
              arrowOnClick={
                modal.hideArrowButton || !showForm
                  ? null
                  : modal.handleClickBack
              }
              crossOnClick={
                modal.hideCrossButton ? null : modal.handleCloseModal
              }
            />

            <Box width="100%" height="100%" padding="0 24px">
              {modal.gettingValueStep && (
                <>
                  <ModalDataItem
                    title={t(
                      "lenderMarketDetails.transactions.deposit.modal.available",
                    )}
                    value={formatTokenWithCommas(marketAccount.maximumDeposit, {
                      withSymbol: true,
                    })}
                    containerSx={{
                      padding: "0 12px",
                      marginTop: "16px",
                      marginBottom: minimumDeposit ? "8px" : "20px",
                    }}
                  />

                  {minimumDeposit && (
                    <ModalDataItem
                      title="Minimum Deposit"
                      value={formatTokenWithCommas(minimumDeposit, {
                        withSymbol: true,
                      })}
                      containerSx={{
                        padding: "0 12px",
                        marginBottom: "20px",
                      }}
                    />
                  )}

                  <NumberTextField
                    label={formatTokenWithCommas(marketAccount.maximumDeposit)}
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
                    disabled={isApproving}
                    error={!!depositError}
                    helperText={depositError}
                  />
                </>
              )}
            </Box>

            <Box width="100%" height="100%" padding="0 24px">
              {isFixedTerm && (
                <Typography variant="text3" color={COLORS.dullRed}>
                  {`This is currently a fixed-term market: deposited funds will be unavailable to withdraw until ${formatDate(
                    fixedTermMaturity,
                  )}.`}
                </Typography>
              )}
            </Box>

            <Box width="100%" height="100%" padding="0 24px">
              {isFixedTerm && earlyTermination && (
                <Typography variant="text3" color={COLORS.dullRed}>
                  This market also has a flag set that allows the borrower to
                  terminate it before maturity by repaying all debt.
                </Typography>
              )}
            </Box>

            <Box width="100%" height="100%" padding="0 24px">
              {isFixedTerm && earlyMaturity && (
                <Typography variant="text3" color={COLORS.dullRed}>
                  This market also has a flag set that allows the borrower to
                  bring the maturity closer to the present day.
                </Typography>
              )}
            </Box>

            <Box width="100%" height="100%" padding="0 24px">
              {modal.approvedStep && (
                <ModalDataItem
                  title={t(
                    "lenderMarketDetails.transactions.deposit.modal.confirm",
                  )}
                  value={formatTokenWithCommas(depositTokenAmount, {
                    withSymbol: true,
                  })}
                  containerSx={{
                    padding: "0 12px",
                    margin: "16px 0 20px",
                  }}
                />
              )}
            </Box>
          </>
        )}

        {isDepositing && <LoadingModal txHash={txHash} />}
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
          mainBtnText={t("lenderMarketDetails.transactions.deposit.button")}
          secondBtnText={isApprovedButton ? "Approved" : "Approve"}
          secondBtnIcon={isApprovedButton}
          mainBtnOnClick={handleDeposit}
          secondBtnOnClick={handleApprove}
          disableMainBtn={disableDeposit}
          disableSecondBtn={disableApprove}
          secondBtnLoading={isApproving}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
