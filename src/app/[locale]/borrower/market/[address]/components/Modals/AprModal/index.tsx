import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Typography,
} from "@mui/material"
import { BIP, Market, SetAprPreview } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { NumberTextField } from "@/components/NumberTextfield"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
  TOKEN_FORMAT_DECIMALS,
} from "@/utils/formatters"

import { DifferenceChip } from "./components/DifferenceChip"
import { AprModalProps } from "./interface"
import {
  AprAffectsBox,
  AprModalCheckbox,
  AprModalConfirmedBox,
  AprModalDialog,
  AprModalFormLabel,
  AprModalMessageBox,
} from "./style"
import { useAdjustAPR } from "../../../hooks/useAdjustApr"
import { ModalDataItem } from "../components/ModalDataItem"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"
import { ModalSteps, useApprovalModal } from "../hooks/useApprovalModal"

const dateInTwoWeeks = () => {
  const today = new Date()
  const twoWeeksLater = new Date(today.setDate(today.getDate() + 14))
  const day = String(twoWeeksLater.getDate()).padStart(2, "0")
  const month = String(twoWeeksLater.getMonth() + 1).padStart(2, "0")
  const year = twoWeeksLater.getFullYear()
  return `${day}/${month}/${year}`
}

function getMinimumAPR(market: Market) {
  const { liquidReserves, outstandingTotalSupply } = market
  const currentCollateralizationBips = liquidReserves
    .mul(BIP)
    .div(outstandingTotalSupply.gt(0) ? outstandingTotalSupply : 1)
    .raw.toNumber()
  const [, originalAnnualInterestBips] =
    market.originalReserveRatioAndAnnualInterestBips

  // reserve ratio set in APR reduction is 2 * relativeReduction
  // so divide collateralization ratio by 2 to get max relative reduction in bips
  if (currentCollateralizationBips < 5_000) {
    // if the max reduction is <25% given the current collateralization ratio,
    // the market still allows a reduction of <=25% with no penalty
    return Math.floor(originalAnnualInterestBips * 0.75)
  }
  const maximumRelativeReduction = Math.min(
    10_000,
    Math.floor(currentCollateralizationBips / 2),
  )
  const maximumReduction = Math.floor(
    (originalAnnualInterestBips * maximumRelativeReduction) / 10_000,
  )
  return originalAnnualInterestBips - maximumReduction
}

export const AprModal = ({ marketAccount }: AprModalProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const [apr, setApr] = useState("")
  const [aprPreview, setAprPreview] = useState<SetAprPreview>()
  const [aprError, setAprError] = useState<string | undefined>()

  const [notified, setNotified] = useState<boolean>(false)

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>()

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setApr,
    setTxHash,
  )

  const { mutate, isPending, isSuccess, isError } = useAdjustAPR(
    marketAccount,
    setTxHash,
  )

  const handleClose = () => {
    modal.handleCloseModal()
    setAprPreview(undefined)
  }

  const handleAprChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setApr(value)

    // If status is not `Ready`, show error message
    const parsedNewApr = parseFloat(value) * 100
    const preview = marketAccount.previewSetAPR(parsedNewApr)
    setAprPreview(preview)

    if (value === "" || value === "0") {
      setAprError(undefined)
      return
    }

    if (preview.status === "InsufficientReserves") {
      setAprError(
        `Missing Reserves – ${preview.missingReserves.format(
          TOKEN_FORMAT_DECIMALS,
          true,
        )} for collateral obligation. Increase percent.`,
      )
      return
    }

    if (preview.status !== "Ready") {
      setAprError(SDK_ERRORS_MAPPING.setApr[preview.status])
    }

    setAprError(undefined)
  }

  const handleConfirm = () => {
    modal.setFlowStep(ModalSteps.approved)
  }

  const handleNotifyLenders = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setNotified(true)
    } else {
      setNotified(false)
    }
  }

  const handleAdjust = () => {
    mutate(parseFloat(apr))
  }

  const handleTryAgain = () => {
    handleAdjust()
    setShowErrorPopup(false)
  }

  const minimumApr = market.outstandingTotalSupply.eq(0)
    ? ""
    : `min - ${formatBps(getMinimumAPR(market))}%`

  const getNewCollateralObligations = () => {
    if (aprPreview) {
      if (
        aprPreview.status !== "InsufficientReserves" &&
        !(aprPreview.status === "Ready" && aprPreview.willChangeReserveRatio)
      ) {
        return undefined
      }
      return aprPreview.newCoverageLiquidity.format(TOKEN_FORMAT_DECIMALS, true)
    }
    return undefined
  }

  const breakdown = market.getTotalDebtBreakdown()

  const currentCollateralObligations = formatTokenWithCommas(
    breakdown.collateralObligation,
    { withSymbol: true },
  )
  const newCollateralObligations = getNewCollateralObligations()

  const currentReserveRatio = formatBps(
    market.reserveRatioBips,
    MARKET_PARAMS_DECIMALS.reserveRatioBips,
  )

  const newReserveRatio =
    aprPreview &&
    formatBps(
      "newReserveRatio" in aprPreview
        ? aprPreview.newReserveRatio
        : market.reserveRatioBips,
    )

  const twoWeeksTime = dateInTwoWeeks()

  const reserveRatioExpiry = dayjs(
    market.temporaryReserveRatioExpiry * 1000,
  ).format("DD/MM/YYYY HH:MM")

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const isAprLTZero = parseFloat(apr) <= 0

  const disableConfirm =
    apr === "" ||
    isAprLTZero ||
    apr === formatBps(market.annualInterestBips) ||
    !!aprError ||
    modal.approvedStep

  const isFixedTerm = market.isInFixedTerm

  const aprReductionForbidden =
    isFixedTerm && parseFloat(apr) < market.annualInterestBips

  const disableAdjust =
    apr === "" ||
    apr === "0" ||
    !!aprError ||
    modal.gettingValueStep ||
    !notified ||
    aprReductionForbidden

  const isResetToOriginalRatio =
    aprPreview &&
    aprPreview.status === "Ready" &&
    aprPreview.willChangeReserveRatio &&
    aprPreview.changeCausedByReset

  const showRatioTimer =
    !!apr &&
    !aprError &&
    newReserveRatio !== currentReserveRatio &&
    !isResetToOriginalRatio

  const tempReserveRatio =
    market.temporaryReserveRatio &&
    !showRatioTimer &&
    formatBps(market.originalReserveRatioBips) !== newReserveRatio

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  const { approvedStep } = modal

  useEffect(() => {
    setNotified(false)
  }, [approvedStep])

  if (!market) return null

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={modal.handleOpenModal}
        disabled={market.isClosed}
      >
        {t("borrowerMarketDetails.modals.apr.adjustBase")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : handleClose}
        sx={AprModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("borrowerMarketDetails.modals.apr.adjustBase")}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          >
            <Box sx={AprModalMessageBox}>
              <Typography variant="text3" color={COLORS.santasGrey}>
                {t("borrowerMarketDetails.modals.apr.alreadyUpdated")}
              </Typography>
              <Link
                href="https://docs.wildcat.finance/using-wildcat/terminology#base-apr"
                target="_blank"
                style={{ textDecoration: "none" }}
              >
                <Typography variant="text3" color={COLORS.blueRibbon}>
                  {t("borrowerMarketDetails.modals.apr.learnMore")}
                </Typography>
              </Link>
            </Box>
          </TxModalHeader>
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="12px 24px">
            {modal.gettingValueStep && (
              <>
                <ModalDataItem
                  title={t("borrowerMarketDetails.modals.apr.currentBaseApr")}
                  value={`${formatBps(
                    market.annualInterestBips,
                    MARKET_PARAMS_DECIMALS.annualInterestBips,
                  )}%`}
                  containerSx={{
                    padding: "0 12px",
                    marginBottom: "14px",
                  }}
                />

                <NumberTextField
                  decimalScale={2}
                  min={0}
                  max={100}
                  label={formatBps(
                    market.annualInterestBips,
                    MARKET_PARAMS_DECIMALS.annualInterestBips,
                  )}
                  size="medium"
                  sx={{
                    width: "100%",
                  }}
                  value={apr}
                  onChange={handleAprChange}
                  error={!!aprError}
                  helperText={aprError}
                  endAdornment={
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{ padding: "0 12px" }}
                    >
                      {minimumApr}
                    </Typography>
                  }
                />

                <Box marginTop={aprError ? "44px" : "28px"} sx={AprAffectsBox}>
                  <Typography variant="text4" textTransform="uppercase">
                    {t("borrowerMarketDetails.modals.apr.aprAffects")}
                  </Typography>

                  <ModalDataItem
                    title={t(
                      "borrowerMarketDetails.modals.apr.collateralObligation",
                    )}
                    value={
                      newCollateralObligations ?? currentCollateralObligations
                    }
                    valueColor={
                      !aprError &&
                      newCollateralObligations &&
                      newCollateralObligations !== currentCollateralObligations
                        ? COLORS.bunker
                        : COLORS.santasGrey
                    }
                    containerSx={{ marginBottom: "12px", marginTop: "12px" }}
                  >
                    {newCollateralObligations && (
                      <DifferenceChip
                        startValue={currentCollateralObligations}
                        endValue={newCollateralObligations}
                        error={!!aprError}
                        type="percentage"
                      />
                    )}
                  </ModalDataItem>

                  <ModalDataItem
                    title={t("borrowerMarketDetails.modals.apr.reservedRatio")}
                    value={`${newReserveRatio ?? currentReserveRatio}%`}
                    valueColor={
                      !aprError &&
                      newReserveRatio &&
                      newReserveRatio !== currentReserveRatio
                        ? COLORS.bunker
                        : COLORS.santasGrey
                    }
                  >
                    {newReserveRatio && (
                      <DifferenceChip
                        startValue={currentReserveRatio}
                        endValue={newReserveRatio}
                        error={!!aprError}
                        type="difference"
                      />
                    )}
                  </ModalDataItem>

                  {showRatioTimer && (
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{ marginLeft: "auto", marginTop: "4px" }}
                    >
                      {`${t(
                        "borrowerMarketDetails.modals.apr.willSetTemporarily",
                      )} ${twoWeeksTime}`}
                    </Typography>
                  )}

                  {tempReserveRatio && (
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{ marginLeft: "auto", marginTop: "4px" }}
                    >
                      {`${t(
                        "borrowerMarketDetails.modals.apr.setTemporarily",
                      )} ${reserveRatioExpiry}`}
                    </Typography>
                  )}
                </Box>
              </>
            )}

            <Box width="100%" height="100%" padding="24px">
              {isFixedTerm && parseFloat(apr) < market.annualInterestBips && (
                <Typography variant="text3" color={COLORS.dullRed}>
                  APR cannot be reduced for a fixed-term market.
                </Typography>
              )}
            </Box>

            {modal.approvedStep &&
              (!isFixedTerm ||
                (isFixedTerm &&
                  parseFloat(apr) >= market.annualInterestBips)) && (
                <Box sx={AprModalConfirmedBox}>
                  <ModalDataItem
                    title={t("borrowerMarketDetails.modals.apr.newBaseApr")}
                    value={`${apr}%`}
                    containerSx={{ marginBottom: "16px" }}
                  >
                    {apr && (
                      <DifferenceChip
                        startValue={formatBps(
                          market.annualInterestBips,
                          MARKET_PARAMS_DECIMALS.annualInterestBips,
                        )}
                        endValue={apr}
                        error={!!aprError}
                        type="percentage"
                      />
                    )}
                  </ModalDataItem>

                  <ModalDataItem
                    title={t(
                      "borrowerMarketDetails.modals.apr.newCollateralObligation",
                    )}
                    value={
                      newCollateralObligations ?? currentCollateralObligations
                    }
                    valueColor={
                      !aprError &&
                      newCollateralObligations &&
                      newCollateralObligations !== currentCollateralObligations
                        ? COLORS.bunker
                        : COLORS.santasGrey
                    }
                    containerSx={{ marginBottom: "16px" }}
                  >
                    {newCollateralObligations && (
                      <DifferenceChip
                        startValue={currentCollateralObligations}
                        endValue={newCollateralObligations}
                        error={!!aprError}
                        type="percentage"
                      />
                    )}
                  </ModalDataItem>

                  <ModalDataItem
                    title={t(
                      "borrowerMarketDetails.modals.apr.newReservedRatio",
                    )}
                    value={`${newReserveRatio ?? currentReserveRatio}%`}
                    valueColor={
                      !aprError &&
                      newReserveRatio &&
                      newReserveRatio !== currentReserveRatio
                        ? COLORS.bunker
                        : COLORS.santasGrey
                    }
                  >
                    {newReserveRatio && (
                      <DifferenceChip
                        startValue={currentReserveRatio}
                        endValue={newReserveRatio}
                        error={!!aprError}
                        type="difference"
                      />
                    )}
                  </ModalDataItem>

                  {showRatioTimer && (
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{
                        marginLeft: "auto",
                        marginTop: "4px",
                        padding: "0 12px",
                      }}
                    >
                      {`${t(
                        "borrowerMarketDetails.modals.apr.willSetTemporarily",
                      )} ${twoWeeksTime}`}
                    </Typography>
                  )}

                  {tempReserveRatio && (
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{
                        marginLeft: "auto",
                        marginTop: "4px",
                        padding: "0 12px",
                      }}
                    >
                      {`${t(
                        "borrowerMarketDetails.modals.apr.setTemporarily",
                      )} ${reserveRatioExpiry}`}
                    </Typography>
                  )}

                  <FormControlLabel
                    label={t(
                      "borrowerMarketDetails.modals.apr.approveNotified",
                    )}
                    sx={AprModalFormLabel}
                    control={
                      <ExtendedCheckbox
                        sx={AprModalCheckbox}
                        value={market}
                        onChange={(event) => handleNotifyLenders(event)}
                        checked={notified}
                      />
                    }
                  />
                </Box>
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

        {showForm && (
          <TxModalFooter
            mainBtnText={
              aprReductionForbidden
                ? "Forbidden"
                : t("borrowerMarketDetails.modals.apr.adjust")
            }
            secondBtnText={
              modal.approvedStep
                ? t("borrowerMarketDetails.modals.apr.confirmed")
                : t("borrowerMarketDetails.modals.apr.confirm")
            }
            mainBtnOnClick={handleAdjust}
            secondBtnOnClick={handleConfirm}
            disableMainBtn={disableAdjust}
            disableSecondBtn={disableConfirm}
            secondBtnIcon={modal.approvedStep}
            hideButtons={!showForm}
          />
        )}
      </Dialog>
    </>
  )
}
