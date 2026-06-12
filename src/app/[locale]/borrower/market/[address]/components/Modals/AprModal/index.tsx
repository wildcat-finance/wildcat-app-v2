import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  SvgIcon,
  Typography,
} from "@mui/material"
import { BIP, Market, SetAprPreview } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Alert from "@/assets/icons/circledAlert_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { DepositAlert } from "@/components/DepositAlert"
import { NumberTextField } from "@/components/NumberTextfield"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
  TOKEN_FORMAT_DECIMALS,
} from "@/utils/formatters"
import { getPendingPeriodicAprChange } from "@/utils/periodicApr"

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
import { type AdjustAprMode, useAdjustAPR } from "../../../hooks/useAdjustApr"
import { useResetTempReserveRatio } from "../../../hooks/useResetTempReserveRatio"
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

const parseAprBips = (value: string) => {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined
}

export const AprModal = ({ marketAccount }: AprModalProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const [apr, setApr] = useState("")
  const [aprPreview, setAprPreview] = useState<SetAprPreview>()
  const [aprError, setAprError] = useState<string | undefined>()
  const [aprFixedReduction, setAprFixReduction] = useState<boolean>(false)

  const [notified, setNotified] = useState<boolean>(false)

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>()

  const [showResetSuccessPopup, setShowResetSuccessPopup] = useState(false)
  const [showResetErrorPopup, setShowResetErrorPopup] = useState(false)
  const [resetTxHash, setResetTxHash] = useState<string | undefined>()

  const isFixedTerm = market.isInFixedTerm
  const aprBips = parseAprBips(apr)
  const isPeriodicTerm = !!market.periodicHooksConfig
  const existingPendingProposal = isPeriodicTerm
    ? getPendingPeriodicAprChange(market)
    : undefined
  const isPeriodicAprReduction =
    isPeriodicTerm &&
    aprBips !== undefined &&
    aprBips < market.annualInterestBips
  const aprChangeMode: AdjustAprMode = isPeriodicAprReduction
    ? "propose"
    : "set"

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

  const {
    mutate: resetMutate,
    isPending: isResetPending,
    isSuccess: isResetSuccess,
    isError: isResetError,
  } = useResetTempReserveRatio(marketAccount, setResetTxHash)

  const handleClose = () => {
    modal.handleCloseModal()
    setAprPreview(undefined)
    setAprError(undefined)
    setAprFixReduction(false)
    setShowResetErrorPopup(false)
    setShowResetSuccessPopup(false)
  }

  const handleAprChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setApr(value)
    setAprPreview(undefined)
    setAprFixReduction(false)

    if (value === "" || value === "0") {
      setAprError(undefined)
      return
    }

    const parsedNewApr = parseAprBips(value)
    if (parsedNewApr === undefined) {
      setAprError(SDK_ERRORS_MAPPING.setApr.InvalidApr)
      return
    }

    if (isPeriodicTerm && parsedNewApr < market.annualInterestBips) {
      const preview =
        marketAccount.previewProposeAnnualInterestBips(parsedNewApr)
      if (preview.status !== "Ready") {
        setAprError(SDK_ERRORS_MAPPING.proposeApr[preview.status])
        return
      }

      setAprError(undefined)
      return
    }

    const preview = marketAccount.previewSetAPR(parsedNewApr)
    setAprPreview(preview)
    setAprFixReduction(isFixedTerm && parsedNewApr < market.annualInterestBips)

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
      return
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
    if (aprBips === undefined) return
    mutate({ apr: aprBips / 100, mode: aprChangeMode })
  }

  const handleTryAgain = () => {
    handleAdjust()
    setShowErrorPopup(false)
  }

  const minimumApr = (() => {
    if (isPeriodicTerm || market.outstandingTotalSupply.eq(0)) return ""
    return `min - ${formatBps(getMinimumAPR(market))}%`
  })()

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
  ).format("DD/MM/YYYY HH:mm")

  const nowSec = Date.now() / 1000
  const isExpiredTempRatio =
    market.temporaryReserveRatio && market.temporaryReserveRatioExpiry < nowSec

  const needsReset =
    !isPeriodicAprReduction &&
    isExpiredTempRatio &&
    aprBips !== undefined &&
    aprBips < market.annualInterestBips

  const showForm = !(
    isPending ||
    isResetPending ||
    showSuccessPopup ||
    showErrorPopup ||
    showResetSuccessPopup ||
    showResetErrorPopup
  )

  const isAprNotPositive = aprBips === undefined || aprBips <= 0
  const isAprUnchanged =
    aprBips !== undefined && aprBips === market.annualInterestBips

  const disableConfirm =
    apr === "" ||
    isAprNotPositive ||
    isAprUnchanged ||
    !!aprError ||
    modal.approvedStep ||
    aprFixedReduction

  const disableAdjust =
    apr === "" ||
    isAprNotPositive ||
    isAprUnchanged ||
    !!aprError ||
    modal.gettingValueStep ||
    !notified ||
    aprFixedReduction

  const isResetToOriginalRatio =
    aprPreview &&
    aprPreview.status === "Ready" &&
    aprPreview.willChangeReserveRatio &&
    aprPreview.changeCausedByReset

  const showRatioTimer =
    !!apr &&
    !isPeriodicAprReduction &&
    !aprError &&
    newReserveRatio !== currentReserveRatio &&
    !isResetToOriginalRatio

  const tempReserveRatio =
    !isPeriodicAprReduction &&
    market.temporaryReserveRatio &&
    !showRatioTimer &&
    formatBps(market.originalReserveRatioBips) !== newReserveRatio

  const getMainButtonText = () => {
    if (needsReset) return t("borrowerMarketDetails.modals.apr.resetTempRatio")
    if (aprFixedReduction) return "Forbidden [Fixed-Term]"
    if (isPeriodicAprReduction) {
      return t("borrowerMarketDetails.modals.apr.proposeReduction")
    }
    return t("borrowerMarketDetails.modals.apr.adjust")
  }

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  useEffect(() => {
    if (isResetError) {
      setShowResetErrorPopup(true)
    }
    if (isResetSuccess) {
      setShowResetSuccessPopup(true)
    }
  }, [isResetError, isResetSuccess])

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
        onClose={isPending || isResetPending ? undefined : handleClose}
        sx={AprModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposeReductionTitle")
                : t("borrowerMarketDetails.modals.apr.adjustBase")
            }
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
                href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
                target="_blank"
                style={{ textDecoration: "none", display: "flex" }}
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
                {existingPendingProposal && (
                  <Typography
                    variant="text4"
                    color={COLORS.santasGrey}
                    sx={{ display: "block", marginBottom: "12px" }}
                  >
                    {t(
                      "borrowerMarketDetails.modals.apr.pendingProposalReplaceNotice",
                      {
                        proposedApr: formatBps(
                          existingPendingProposal.proposedAprBips,
                          MARKET_PARAMS_DECIMALS.annualInterestBips,
                        ),
                        readyAt: dayjs
                          .unix(existingPendingProposal.responseWindowEnd)
                          .utc()
                          .format("D MMM YYYY, HH:mm [UTC]"),
                      },
                    )}
                  </Typography>
                )}

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

                {isPeriodicAprReduction && !aprError && (
                  <Typography
                    variant="text4"
                    color={COLORS.santasGrey}
                    sx={{ display: "block", marginTop: "12px" }}
                  >
                    {t(
                      "borrowerMarketDetails.modals.apr.periodicProposalNotice",
                    )}
                  </Typography>
                )}

                {aprPreview?.status === "Ready" &&
                  aprPreview.willCancelPendingProposal &&
                  existingPendingProposal &&
                  !aprError && (
                    <Typography
                      variant="text4"
                      color={COLORS.butteredRum}
                      sx={{ display: "block", marginTop: "12px" }}
                    >
                      {t(
                        "borrowerMarketDetails.parameters.pendingPeriodicApr.cancelProposalWarning",
                        {
                          proposedApr: formatBps(
                            existingPendingProposal.proposedAprBips,
                            MARKET_PARAMS_DECIMALS.annualInterestBips,
                          ),
                        },
                      )}
                    </Typography>
                  )}

                {!isPeriodicAprReduction && (
                  <Box
                    marginTop={aprError ? "44px" : "28px"}
                    sx={AprAffectsBox}
                  >
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
                        newCollateralObligations !==
                          currentCollateralObligations
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
                      title={t(
                        "borrowerMarketDetails.modals.apr.reservedRatio",
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
                          marginBottom: "4px",
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
                          marginBottom: "4px",
                        }}
                      >
                        {`${t(
                          "borrowerMarketDetails.modals.apr.setTemporarily",
                        )} ${reserveRatioExpiry}`}
                      </Typography>
                    )}
                  </Box>
                )}

                {needsReset && (
                  <DepositAlert
                    text={
                      <Typography variant="mobText3">
                        {t(
                          "borrowerMarketDetails.modals.apr.expiredTempRatioNotice",
                        )}
                      </Typography>
                    }
                    icon={
                      <SvgIcon
                        sx={{
                          fontSize: "16px",
                          "& path": { fill: COLORS.white },
                          mt: "1px",
                        }}
                      >
                        <Alert />
                      </SvgIcon>
                    }
                  />
                )}
              </>
            )}

            {modal.approvedStep && (
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
                  title={t("borrowerMarketDetails.modals.apr.newReservedRatio")}
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

                {isPeriodicAprReduction && (
                  <Typography
                    variant="text4"
                    color={COLORS.santasGrey}
                    sx={{
                      marginTop: "12px",
                      padding: "0 12px",
                    }}
                  >
                    {t(
                      "borrowerMarketDetails.modals.apr.periodicProposalNotice",
                    )}
                  </Typography>
                )}

                <FormControlLabel
                  label={t("borrowerMarketDetails.modals.apr.approveNotified")}
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

        {isPending && (
          <LoadingModal
            txHash={txHash}
            title={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalLoadingTitle")
                : undefined
            }
            subtitle={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalLoadingSubtitle")
                : undefined
            }
          />
        )}
        {isResetPending && <LoadingModal txHash={resetTxHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={modal.handleCloseModal}
            txHash={txHash}
            title={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalErrorTitle")
                : undefined
            }
            subtitle={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalErrorSubtitle")
                : undefined
            }
          />
        )}
        {showResetErrorPopup && (
          <ErrorModal
            onTryAgain={() => {
              resetMutate()
              setShowResetErrorPopup(false)
            }}
            onClose={handleClose}
            txHash={resetTxHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal
            onClose={modal.handleCloseModal}
            txHash={txHash}
            title={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalSuccessTitle")
                : undefined
            }
            subtitle={
              isPeriodicAprReduction
                ? t("borrowerMarketDetails.modals.apr.proposalSuccessSubtitle")
                : undefined
            }
          />
        )}
        {showResetSuccessPopup && (
          <SuccessModal onClose={handleClose} txHash={resetTxHash} />
        )}

        {showForm && (
          <Box sx={{ width: "100%", display: "flex", marginTop: "auto" }}>
            <TxModalFooter
              mainBtnText={getMainButtonText()}
              secondBtnText={
                modal.approvedStep
                  ? t("borrowerMarketDetails.modals.apr.confirmed")
                  : t("borrowerMarketDetails.modals.apr.confirm")
              }
              mainBtnOnClick={needsReset ? () => resetMutate() : handleAdjust}
              secondBtnOnClick={needsReset ? undefined : handleConfirm}
              disableMainBtn={needsReset ? false : disableAdjust}
              disableSecondBtn={needsReset ? true : disableConfirm}
              secondBtnIcon={modal.approvedStep}
              hideButtons={!showForm}
            />
          </Box>
        )}
      </Dialog>
    </>
  )
}
