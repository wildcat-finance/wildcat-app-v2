import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
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
import { useBorrow } from "@/app/[locale]/borrower/market/[address]/hooks/useBorrow"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

import { BorrowModalProps } from "./interface"

export const BorrowModal = ({
  market,
  marketAccount,
  disableBorrowBtn,
}: BorrowModalProps) => {
  const { t } = useTranslation()
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { mutate, isSuccess, isError, isPending } = useBorrow(
    marketAccount,
    setTxHash,
  )

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleBorrow = () => {
    modal.setFlowStep(ModalSteps.approved)
  }

  const handleConfirm = () => {
    mutate(amount)
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
  }

  const underlyingBorrowAmount = amount
    ? marketAccount.market.underlyingToken.parseAmount(amount)
    : marketAccount.market.underlyingToken.parseAmount(0)

  const leftBorrowAmount = market.borrowableAssets.sub(underlyingBorrowAmount)

  // Constants used for fallback computation (match SDK values)
  const SECONDS_IN_365_DAYS = 31_536_000
  const BIP_RAY_RATIO = BigNumber.from(10).pow(23)

  const bipToRay = (bip: number) => BIP_RAY_RATIO.mul(bip)

  // fallback to compute seconds before delinquency in the case
  // of zero-reserve-ration where sdk returns 0 seconds

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computeSecondsBefore = (borrowAmountToken?: TokenAmount): number => {
    // Use SDK-provided value if non-zero (covers usual reserve-driven case)
    const sdkSeconds = borrowAmountToken
      ? market.getSecondsBeforeDelinquencyForBorrowedAmount(borrowAmountToken)
      : market.secondsBeforeDelinquency

    if (sdkSeconds > 0) return sdkSeconds

    // if sdk says 0 seconds then check if protocol fees are still play-on
    if (market.totalDebts.gt(0) && !market.isClosed) {
      // numerator = liquidReserves - minimumReserves (and subtract borrow amount if simulating a tx)
      // we use this as the buffer that protocol fees can erode over time
      // start with the base buffer: liquidReserves minus the policy minimum reserves
      let reserveBuffer = market.liquidReserves.sub(market.minimumReserves)
      // if we're simulating after a borrow, also subtract the borrow amount from the buffer
      if (borrowAmountToken) {
        reserveBuffer = reserveBuffer.sub(borrowAmountToken)
      }

      // means liquid reserves are at or below minimum after
      // accounting for the borrow there is no runway for protocol fees
      if (reserveBuffer.raw.lte(0)) return 0

      try {
        // calc erosion of reserves per second due to protocol fees
        // 1) take totalSupply, scale by annual APR (converted to ray)
        // 2) divide by seconds per year to get per-second interest on supply
        // 3) take the protocol's share of that interest (protocolFeeBips)
        const protocolInterestPerSecond = market.totalSupply
          .rayMul(bipToRay(market.annualInterestBips))
          .div(SECONDS_IN_365_DAYS)
          .bipMul(market.protocolFeeBips)

        // if that protocol-driven depletion is non-zero, compute seconds = numerator / rate
        if (!protocolInterestPerSecond.raw.eq(0)) {
          // divide the available buffer by the per-second drain to get seconds remaining
          const seconds = reserveBuffer
            .div(protocolInterestPerSecond, true)
            .raw.toNumber()
          if (seconds > 0) return seconds
        }
      } catch (e) {
        // if anything goes wrong with the math, ignore me and fall back to sdk value (preserve behaviour)
      }
    }

    return sdkSeconds
  }

  const remainingSeconds = computeSecondsBefore()
  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(remainingSeconds * 1_000, { largest: 1 })
      : ""

  const millisecondsBeforeDelinquency =
    computeSecondsBefore(underlyingBorrowAmount) * 1_000

  const remainingInterestAfterTx =
    market.totalDebts.gt(0) &&
    !market.isClosed &&
    underlyingBorrowAmount.lt(market.borrowableAssets)
      ? humanizeDuration(millisecondsBeforeDelinquency, { largest: 1 })
      : ""

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableBorrow =
    market.isClosed ||
    market.borrowableAssets.eq(0) ||
    underlyingBorrowAmount.gt(market.borrowableAssets) ||
    underlyingBorrowAmount.eq(0)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  return (
    <>
      <Button
        onClick={modal.handleOpenModal}
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        disabled={disableBorrowBtn}
      >
        {t("borrowerMarketDetails.modals.borrow.borrow")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
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
            {modal.approvedStep && (
              <Box sx={TxModalInfoItem} marginBottom="8px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  {t("borrowerMarketDetails.modals.borrow.borrowSum")}
                </Typography>
                <Typography variant="text3">
                  {amount} {market.underlyingToken.symbol}
                </Typography>
              </Box>
            )}

            <Box sx={TxModalInfoItem} marginBottom="8px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {t("borrowerMarketDetails.modals.borrow.availableToBorrow")}
                {modal.approvedStep &&
                  t("borrowerMarketDetails.modals.borrow.afterTransaction")}
              </Typography>
              <Typography variant="text3">
                {formatTokenWithCommas(
                  modal.approvedStep
                    ? leftBorrowAmount
                    : marketAccount.market.borrowableAssets,
                  {
                    withSymbol: true,
                  },
                )}
              </Typography>
            </Box>

            <Box sx={TxModalInfoItem} marginBottom="20px">
              <Typography variant="text3" sx={TxModalInfoTitle}>
                {t("borrowerMarketDetails.modals.borrow.interestRemaining")}
                {modal.approvedStep &&
                  t("borrowerMarketDetails.modals.borrow.afterTransaction")}
              </Typography>
              <Typography variant="text3">
                {modal.approvedStep
                  ? remainingInterestAfterTx
                  : remainingInterest}
              </Typography>
            </Box>

            {!modal.approvedStep && (
              <NumberTextField
                label={`Up to ${formatTokenWithCommas(
                  marketAccount.market.borrowableAssets,
                )}`}
                helperText={
                  underlyingBorrowAmount.gt(market.borrowableAssets)
                    ? `Please, input amount under ${formatTokenWithCommas(
                        market.borrowableAssets,
                        { withSymbol: true },
                      )}`
                    : ""
                }
                error={underlyingBorrowAmount.gt(market.borrowableAssets)}
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
            )}
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
          mainBtnText={modal.approvedStep ? "Confirm" : "Borrow"}
          mainBtnOnClick={modal.approvedStep ? handleConfirm : handleBorrow}
          disableMainBtn={disableBorrow}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
