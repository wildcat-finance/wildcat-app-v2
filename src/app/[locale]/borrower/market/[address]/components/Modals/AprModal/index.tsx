import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Typography,
} from "@mui/material"
import { BIP, Market, SetAprStatus } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import Link from "next/link"

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
  const liquidReserves = market.totalAssets
    .sub(market.lastAccruedProtocolFees)
    .sub(market.normalizedUnclaimedWithdrawals)
  const outstandingSupply = market.outstandingTotalSupply
  const currentCollateralizationBips = liquidReserves
    .mul(BIP)
    .div(outstandingSupply)
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
  const { market } = marketAccount

  const [apr, setApr] = useState("")
  const [aprStatus, setAprStatus] = useState<SetAprStatus>()
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
    setAprStatus(undefined)
  }

  const handleAprChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setApr(value)

    // If status is not `Ready`, show error message
    const parsedNewApr = parseFloat(value) * 100
    const checkAPRStep = marketAccount.checkSetAPRStep(parsedNewApr)
    setAprStatus(checkAPRStep)

    if (value === "" || value === "0") {
      setAprError(undefined)
      return
    }

    if (checkAPRStep.status === "InsufficientReserves") {
      setAprError(
        `Missing Reserves – ${checkAPRStep.missingReserves.format(
          TOKEN_FORMAT_DECIMALS,
          true,
        )} for collateral obligation. Increase percent.`,
      )
      return
    }

    if (checkAPRStep.status !== "Ready") {
      setAprError(SDK_ERRORS_MAPPING.setApr[checkAPRStep.status])
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

  const minimumApr = getMinimumAPR(market)

  const getNewCollateralObligations = () => {
    if (aprStatus) {
      if (
        aprStatus.status !== "InsufficientReserves" &&
        !(aprStatus.status === "Ready" && aprStatus.willChangeReserveRatio)
      ) {
        return undefined
      }
      return aprStatus.newCoverageLiquidity.format(TOKEN_FORMAT_DECIMALS, true)
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
    aprStatus &&
    formatBps(
      "newReserveRatio" in aprStatus
        ? aprStatus.newReserveRatio
        : market.reserveRatioBips,
    )

  const twoWeeksTime = dateInTwoWeeks()

  const reserveRatioExpiry = dayjs(
    market.temporaryReserveRatioExpiry * 1000,
  ).format("DD/MM/YYYY HH:MM")

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const disableConfirm =
    apr === "" ||
    apr === "0" ||
    apr === formatBps(market.annualInterestBips) ||
    !!aprError ||
    modal.approvedStep

  const disableAdjust =
    apr === "" ||
    apr === "0" ||
    !!aprError ||
    modal.gettingValueStep ||
    !notified

  const isResetToOriginalRatio =
    aprStatus &&
    aprStatus.status === "Ready" &&
    aprStatus.willChangeReserveRatio &&
    aprStatus.changeCausedByReset

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
      >
        Adjust Base APR
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : handleClose}
        sx={AprModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title="Adjust Base APR"
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : modal.handleClickBack
            }
            crossOnClick={modal.hideCrossButton ? null : modal.handleCloseModal}
          >
            <Box sx={AprModalMessageBox}>
              <Typography variant="text3" color={COLORS.santasGrey}>
                It’s been already update lately.
              </Typography>
              <Link
                href="https://docs.wildcat.finance/using-wildcat/terminology#base-apr"
                target="_blank"
                style={{ textDecoration: "none" }}
              >
                <Typography variant="text3" color={COLORS.blueRibbon}>
                  Learn more
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
                  title="Current Base APR"
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
                      {`min - ${minimumApr}%`}
                    </Typography>
                  }
                />

                <Box marginTop={aprError ? "44px" : "28px"} sx={AprAffectsBox}>
                  <Typography variant="text4" textTransform="uppercase">
                    Apr affects
                  </Typography>

                  <ModalDataItem
                    title="Collateral Obligation"
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
                    title="Reserved Ratio"
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
                      {`will be set temporarily till ${twoWeeksTime}`}
                    </Typography>
                  )}

                  {tempReserveRatio && (
                    <Typography
                      variant="text4"
                      color={COLORS.santasGrey}
                      sx={{ marginLeft: "auto", marginTop: "4px" }}
                    >
                      {`set temporarily till ${reserveRatioExpiry}`}
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {modal.approvedStep && (
              <Box sx={AprModalConfirmedBox}>
                <ModalDataItem
                  title="New Base APR"
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
                  title="New Collateral Obligation"
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
                  title="New Reserved Ratio"
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
                    {`will be set temporarily till ${twoWeeksTime}`}
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
                    {`set temporarily till ${reserveRatioExpiry}`}
                  </Typography>
                )}

                <FormControlLabel
                  label="I approve that I notified active lenders about changing APR"
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
            mainBtnText="Adjust"
            secondBtnText={modal.approvedStep ? "Confirmed" : "Confirm"}
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
