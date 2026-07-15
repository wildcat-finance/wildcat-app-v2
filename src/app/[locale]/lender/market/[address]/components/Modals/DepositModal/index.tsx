import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  FormControlLabel,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { DepositStatus, Signer, HooksKind } from "@wildcatfi/wildcat-sdk"
import { Trans, useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { BorrowerPenaltyWarning } from "@/app/[locale]/lender/market/[address]/components/BorrowerPenaltyWarning"
import { useGetBorrowerProfile } from "@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile"
import Alert from "@/assets/icons/circledAlert_icon.svg"
import Clock from "@/assets/icons/clock_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { DepositAlert } from "@/components/DepositAlert"
import { LinkGroup } from "@/components/LinkComponent"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TooltipButton } from "@/components/TooltipButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { formatDate } from "@/lib/mla"
import { COLORS } from "@/theme/colors"
import {
  hasManuallyDisabledMarketActions,
  isUSDTLikeToken,
} from "@/utils/constants"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { EarningsProjection } from "./EarningsProjection"
import { DepositModalProps } from "./interface"
import { useDepositGate } from "./useDepositGate"
import { useDeposit } from "../../../hooks/useDeposit"

type BorrowerIdentityDisclosureProps = {
  legalName: string | undefined
  alias: string | undefined
}

const BorrowerIdentityDisclosure = ({
  legalName,
  alias,
}: BorrowerIdentityDisclosureProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  if (!legalName) return null

  const items = [
    {
      label: t("common.fields.legalName"),
      value: legalName,
    },
    ...(alias
      ? [
          {
            label: t("common.fields.alias"),
            value: alias,
          },
        ]
      : []),
  ]

  return (
    <Box>
      <Typography variant={isMobile ? "mobText2" : "text1"}>
        {t("marketDetails.lender.modals.deposit.depositingToBorrower")}
      </Typography>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginTop: isMobile ? "8px" : "12px",
          marginBottom: isMobile ? "20px" : "28px",
        }}
      >
        {items.map(({ label, value }) => (
          <Box
            key={label}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.blackRock}
              sx={{ opacity: 0.8 }}
            >
              {`${label}:`}
            </Typography>

            <Typography variant={isMobile ? "mobText3" : "text3"}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export const DepositModal = ({
  marketAccount,
  isMobileOpen,
  setIsMobileOpen,
  showBorrowerPenaltyWarning,
}: DepositModalProps) => {
  const isMobile = useMobileResolution()

  const { t } = useTranslation()
  const { getTxUrl } = useBlockExplorer()

  const { market } = marketAccount

  const { data: borrowerProfile } = useGetBorrowerProfile(
    market.chainId,
    market.borrower as `0x${string}`,
  )

  const borrowerLegalName = borrowerProfile?.name?.trim()
  const borrowerAlias = borrowerProfile?.alias?.trim()
  const displayedBorrowerAlias =
    borrowerLegalName &&
    borrowerAlias &&
    borrowerAlias.toLowerCase() !== borrowerLegalName.toLowerCase()
      ? borrowerAlias
      : undefined

  const [amount, setAmount] = useState("")

  const [depositError, setDepositError] = useState<string | undefined>()

  const { connected: isConnectedToSafe } = useSafeAppsSDK()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>("")

  const {
    mutate: deposit,
    isPending: isDepositing,
    isSuccess: isDeposed,
    isError: isDepositError,
    reset: resetDeposit,
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

  const gate = useDepositGate({
    required: !!showBorrowerPenaltyWarning,
    isModalOpen: modal.isModalOpen || !!isMobileOpen,
  })

  // user inputted amount
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

  const isAllowanceSufficient = marketAccount.isApprovedFor(depositTokenAmount)
  const marketActionsManuallyDisabled = hasManuallyDisabledMarketActions(
    market.borrower,
  )

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleDeposit = () => {
    if (marketActionsManuallyDisabled) return

    setTxHash("")
    deposit(depositTokenAmount)
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleDeposit()
  }

  const handleApprove = () => {
    if (marketActionsManuallyDisabled) return

    setTxHash("")

    if (!isAllowanceSufficient) {
      if (
        marketAccount.underlyingApproval.gt(0) &&
        isUSDTLikeToken(market.underlyingToken.address)
      ) {
        approve(depositTokenAmount.token.getAmount(0)).then(() => {
          approve(depositTokenAmount).then(() => {
            if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
              setAmount("")
            }
          })
        })
      } else {
        approve(depositTokenAmount).then(() => {
          if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
            setAmount("")
          }
        })
      }
    }
  }

  const mustResetAllowance =
    !isAllowanceSufficient &&
    marketAccount.underlyingApproval.gt(0) &&
    isUSDTLikeToken(market.underlyingToken.address)

  const disableApprove =
    marketActionsManuallyDisabled ||
    !borrowerLegalName ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    isAllowanceSufficient ||
    isApproving ||
    !Signer.isSigner(market.provider)

  const disableDeposit =
    marketActionsManuallyDisabled ||
    !borrowerLegalName ||
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    (depositStep === "InsufficientAllowance" && !isConnectedToSafe) ||
    depositStep === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    isAllowanceSufficient && !depositTokenAmount.raw.isZero() && !isApproving

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

  const underlyingBalanceIsZero = marketAccount.underlyingBalance.raw.isZero()

  const tooltip = underlyingBalanceIsZero
    ? t("marketDetails.lender.modals.deposit.tooltips.underlyingBalanceZero")
    : t("marketDetails.lender.modals.deposit.tooltips.marketAtCapacity")

  useEffect(() => {
    if (amount === "" || amount === "0" || depositStep === "Ready") {
      setDepositError(undefined)
      return
    }

    if (depositStep === "InsufficientBalance") {
      if (isAllowanceSufficient) {
        setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
      } else {
        setDepositError(
          t("marketDetails.lender.modals.deposit.errors.amountExceedsBalance"),
        )
      }
      return
    }

    setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
  }, [
    depositStep,
    amount,
    isAllowanceSufficient,
    marketAccount.underlyingBalance,
    market.underlyingToken.symbol,
    t,
  ])

  useEffect(() => {
    if (isMobileOpen) {
      modal.handleOpenModal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileOpen])

  useEffect(() => {
    if (isDepositError) {
      setShowErrorPopup(true)
    }
    if (isDeposed) {
      setShowSuccessPopup(true)
    }
  }, [isDepositError, isDeposed])

  const handleModalArrowClick = () => {
    if (modal.gettingValueStep && !!setIsMobileOpen) {
      setIsMobileOpen(false)
    }
    modal.handleClickBack()
  }

  const handleCloseMobileModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    resetDeposit()
    modal.handleCloseModal()
    if (setIsMobileOpen) {
      setIsMobileOpen(false)
    }
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 33
    if (isDepositing) return 66
    if (showSuccessPopup) return 100

    return 0
  }

  if (isMobile && isMobileOpen)
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "14px",
            paddingBottom: "12px",
          }}
        >
          <TransactionHeader
            label={t("marketDetails.lender.modals.deposit.title")}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : handleModalArrowClick
            }
            crossOnClick={handleCloseMobileModal}
            progress={progressAmount()}
          />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              width: "100%",
              backgroundColor: COLORS.white,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {showForm && showBorrowerPenaltyWarning && (
              <Box sx={{ marginTop: "24px" }}>
                <BorrowerPenaltyWarning variant="modal" />
              </Box>
            )}

            <Box
              sx={{
                padding: "24px 20px 0",
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {gate.gateActive ? (
                <FormControlLabel
                  label={t("marketDetails.lender.modals.deposit.gate.checkbox")}
                  sx={{
                    alignItems: "flex-start",
                    "& .MuiCheckbox-root": { marginTop: "1px" },
                  }}
                  control={
                    <ExtendedCheckbox
                      sx={{
                        "& ::before": {
                          transform: "translate(-3px, -3px) scale(0.75)",
                        },
                      }}
                      onChange={(event) =>
                        gate.setAcknowledged(event.target.checked)
                      }
                      checked={gate.acknowledged}
                    />
                  }
                />
              ) : (
                <>
                  {modal.gettingValueStep && (
                    <>
                      <Typography variant="mobText2">
                        {t(
                          "marketDetails.lender.modals.deposit.chooseDepositAmount",
                        )}
                      </Typography>

                      {minimumDeposit && (
                        <Typography
                          color={COLORS.santasGrey}
                          variant="mobText3"
                        >
                          {t(
                            "marketDetails.lender.modals.deposit.minimumDeposit",
                          )}{" "}
                          <Typography
                            variant="mobText3"
                            color={COLORS.ultramarineBlue}
                          >
                            {formatTokenWithCommas(minimumDeposit, {
                              withSymbol: true,
                            })}
                          </Typography>
                        </Typography>
                      )}

                      <Typography color={COLORS.santasGrey} variant="mobText3">
                        {t(
                          "marketDetails.lender.modals.deposit.availableToDeposit",
                        )}{" "}
                        <Typography
                          variant="mobText3"
                          color={COLORS.ultramarineBlue}
                        >
                          {formatTokenWithCommas(marketAccount.maximumDeposit, {
                            withSymbol: true,
                          })}
                        </Typography>
                      </Typography>

                      <NumberTextField
                        label={formatTokenWithCommas(
                          marketAccount.maximumDeposit,
                        )}
                        size="medium"
                        style={{
                          width: "100%",
                          marginTop: "12px",
                          marginBottom: "24px",
                        }}
                        value={amount}
                        onChange={handleAmountChange}
                        endAdornment={
                          <TextfieldChip
                            text={market.underlyingToken.symbol}
                            size="small"
                          />
                        }
                        disabled={isApproving}
                        error={
                          !!depositError &&
                          (depositStep !== "InsufficientBalance" ||
                            isAllowanceSufficient)
                        }
                        helperText={depositError}
                      />
                    </>
                  )}

                  {showForm && !gate.gateActive && (
                    <BorrowerIdentityDisclosure
                      legalName={borrowerLegalName}
                      alias={displayedBorrowerAlias}
                    />
                  )}

                  <Divider
                    sx={{
                      borderColor: COLORS.whiteLilac,
                    }}
                  />

                  <EarningsProjection
                    depositAmount={depositTokenAmount}
                    annualInterestBips={market.annualInterestBips}
                    underlyingToken={market.underlyingToken}
                  />

                  <Box
                    sx={{
                      marginTop: "12px",
                      marginBottom: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {isFixedTerm && (
                      <DepositAlert
                        text={
                          <Typography variant="mobText3">
                            <Trans
                              i18nKey="marketDetails.lender.modals.deposit.alerts.fixedTermLockedUntil"
                              values={{
                                date: formatDate(fixedTermMaturity || 0),
                              }}
                              components={{
                                underline: (
                                  <span
                                    style={{ textDecoration: "underline" }}
                                  />
                                ),
                              }}
                            />
                          </Typography>
                        }
                        icon={
                          <SvgIcon
                            sx={{
                              fontSize: "16px",
                              "& path": { fill: COLORS.greySuit },
                              mt: "1px",
                            }}
                          >
                            <Clock />
                          </SvgIcon>
                        }
                      />
                    )}

                    {isFixedTerm && earlyTermination && (
                      <DepositAlert
                        text={
                          <Typography variant="mobText3">
                            {t(
                              "marketDetails.lender.modals.deposit.alerts.canRepayEarly",
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

                    {isFixedTerm && earlyMaturity && (
                      <DepositAlert
                        text={
                          <Typography variant="mobText3">
                            {t(
                              "marketDetails.lender.modals.deposit.alerts.canShortenDuration",
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

                    {mustResetAllowance && (
                      <DepositAlert
                        text={
                          <Typography variant="mobText3">
                            <Trans
                              i18nKey="marketDetails.lender.modals.deposit.alerts.resetAllowance"
                              values={{
                                allowance: market.underlyingToken
                                  .getAmount(marketAccount.underlyingApproval)
                                  .format(
                                    market.underlyingToken.decimals,
                                    true,
                                  ),
                                symbol: market.underlyingToken.symbol,
                              }}
                              components={{ break: <br /> }}
                            />
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
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {txHash !== "" && showForm && (
            <LinkGroup
              type="etherscan"
              linkValue={getTxUrl(txHash as string)}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

          <Box sx={{ flexShrink: 0, pt: "8px" }}>
            {gate.gateActive ? (
              <TxModalFooter
                mainBtnText={t(
                  "marketDetails.lender.modals.deposit.gate.button",
                )}
                mainBtnOnClick={gate.accept}
                disableMainBtn={!gate.acknowledged}
                hideButtons={!showForm}
              />
            ) : (
              <TxModalFooter
                mainBtnText={t(
                  "marketDetails.lender.transactions.deposit.button",
                )}
                secondBtnText={
                  // eslint-disable-next-line no-nested-ternary
                  isConnectedToSafe
                    ? undefined
                    : isApprovedButton
                      ? t("marketDetails.lender.modals.deposit.approved")
                      : t("marketDetails.lender.modals.deposit.approve")
                }
                secondBtnIcon={isApprovedButton && !isConnectedToSafe}
                mainBtnOnClick={handleDeposit}
                secondBtnOnClick={handleApprove}
                disableMainBtn={disableDeposit}
                disableSecondBtn={disableApprove}
                secondBtnLoading={isApproving}
                hideButtons={!showForm}
              />
            )}
          </Box>
        </Box>

        <Dialog
          open={isDepositing || showErrorPopup || showSuccessPopup}
          sx={{
            backdropFilter: "blur(10px)",

            "& .MuiDialog-paper": {
              height: "353px",
              width: "100%",
              border: "none",
              borderRadius: "20px",
              padding: "24px 0",
              margin: "auto 0 4px",
            },
          }}
        >
          {isDepositing && <LoadingModal txHash={txHash} />}
          {showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={() => {
                setShowErrorPopup(false)
                resetDeposit()
                modal.handleCloseModal()
                if (setIsMobileOpen) setIsMobileOpen(false)
              }}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal
              onClose={() => {
                setShowSuccessPopup(false)
                resetDeposit()
                modal.handleCloseModal()
                if (setIsMobileOpen) setIsMobileOpen(false)
              }}
              txHash={txHash}
            />
          )}
        </Dialog>
      </>
    )

  if (!isMobile)
    return (
      <>
        {marketAccount.maximumDeposit.raw.isZero() ||
        underlyingBalanceIsZero ? (
          <Tooltip title={tooltip} placement="right">
            <Box sx={{ display: "flex" }}>
              <Button
                onClick={modal.handleOpenModal}
                variant="contained"
                size="large"
                sx={{ width: "152px" }}
                disabled={
                  marketActionsManuallyDisabled ||
                  marketAccount.maximumDeposit.raw.isZero() ||
                  underlyingBalanceIsZero
                }
              >
                {t("marketDetails.lender.transactions.deposit.button")}
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <Button
            onClick={modal.handleOpenModal}
            variant="contained"
            size="large"
            sx={{ width: "152px" }}
            disabled={
              marketActionsManuallyDisabled ||
              marketAccount.maximumDeposit.raw.isZero() ||
              underlyingBalanceIsZero
            }
          >
            {t("marketDetails.lender.transactions.deposit.button")}
          </Button>
        )}

        <Dialog
          open={modal.isModalOpen}
          onClose={isDepositing ? undefined : modal.handleCloseModal}
          maxWidth={false}
          PaperProps={{
            sx: {
              minWidth: "654px !important",
              width: "654px",
              maxWidth: "654px",
              maxHeight: "calc(100dvh - 64px)",
              boxSizing: "border-box",
              border: "none",
              borderRadius: "20px",
              margin: 0,
              padding: showForm ? 0 : "24px 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          }}
        >
          {showForm && (
            <>
              <Box
                flexShrink={0}
                paddingTop="14px"
                sx={{
                  "& .MuiDivider-root": {
                    margin: "12px 0 8px",
                  },
                }}
              >
                <TxModalHeader
                  title={t("marketDetails.lender.modals.deposit.title")}
                  arrowOnClick={
                    modal.hideArrowButton || !showForm
                      ? null
                      : modal.handleClickBack
                  }
                  crossOnClick={
                    modal.hideCrossButton ? null : modal.handleCloseModal
                  }
                />
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {showBorrowerPenaltyWarning && (
                  <Box mb="24px">
                    <BorrowerPenaltyWarning variant="modal" />
                  </Box>
                )}

                {gate.gateActive ? (
                  <Box
                    width="100%"
                    padding="0 24px"
                    display="flex"
                    flexDirection="column"
                    gap="10px"
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Typography variant="text1">
                        {t("marketDetails.lender.modals.deposit.gate.heading")}
                      </Typography>

                      <TooltipButton
                        value={t(
                          "marketDetails.lender.modals.deposit.gate.tooltip",
                        )}
                      />
                    </Box>

                    <FormControlLabel
                      label={t(
                        "marketDetails.lender.modals.deposit.gate.checkbox",
                      )}
                      sx={{ marginBottom: "30px" }}
                      control={
                        <ExtendedCheckbox
                          sx={{
                            "& ::before": {
                              transform: "translate(-3px, -3px) scale(0.75)",
                            },
                          }}
                          onChange={(event) =>
                            gate.setAcknowledged(event.target.checked)
                          }
                          checked={gate.acknowledged}
                        />
                      }
                    />
                  </Box>
                ) : (
                  <>
                    {modal.gettingValueStep && (
                      <Box
                        width="100%"
                        padding="0 24px"
                        marginTop={showBorrowerPenaltyWarning ? 0 : "12px"}
                        display="flex"
                        flexDirection="column"
                      >
                        <Typography variant="text1" sx={{ mb: "6px" }}>
                          {t(
                            "marketDetails.lender.modals.deposit.chooseDepositAmount",
                          )}
                        </Typography>

                        {minimumDeposit && (
                          <Typography
                            sx={{ mb: "4px" }}
                            color={COLORS.santasGrey}
                            variant="text3"
                            lineHeight="24px"
                          >
                            {t(
                              "marketDetails.lender.modals.deposit.minimumDeposit",
                            )}{" "}
                            <Typography
                              variant="text3"
                              lineHeight="24px"
                              color={COLORS.ultramarineBlue}
                            >
                              {formatTokenWithCommas(minimumDeposit, {
                                withSymbol: true,
                              })}
                            </Typography>
                          </Typography>
                        )}

                        <Typography
                          color={COLORS.santasGrey}
                          variant="text3"
                          lineHeight="24px"
                        >
                          {t(
                            "marketDetails.lender.modals.deposit.availableToDeposit",
                          )}{" "}
                          <Typography
                            variant="text3"
                            lineHeight="24px"
                            color={COLORS.ultramarineBlue}
                          >
                            {formatTokenWithCommas(
                              marketAccount.maximumDeposit,
                              {
                                withSymbol: true,
                              },
                            )}
                          </Typography>
                        </Typography>

                        <NumberTextField
                          label={formatTokenWithCommas(
                            marketAccount.maximumDeposit,
                          )}
                          size="medium"
                          style={{
                            width: "100%",
                            marginTop: "14px",
                            marginBottom: "28px",
                          }}
                          sx={{
                            "& .MuiInputBase-root": {
                              backgroundColor: COLORS.white,
                              border: `1px solid ${COLORS.greySuit}`,
                              borderRadius: "10px",
                              "&:hover": {
                                backgroundColor: COLORS.white,
                                borderColor: COLORS.santasGrey,
                              },
                              "&.Mui-focused": {
                                backgroundColor: COLORS.white,
                                borderColor: COLORS.santasGrey,
                              },
                              "&.Mui-error": {
                                borderColor: COLORS.wildWatermelon,
                              },
                            },
                          }}
                          value={amount}
                          onChange={handleAmountChange}
                          endAdornment={
                            <TextfieldChip
                              text={market.underlyingToken.symbol}
                              size="small"
                            />
                          }
                          disabled={isApproving}
                          error={
                            !!depositError &&
                            (depositStep !== "InsufficientBalance" ||
                              isAllowanceSufficient)
                          }
                          helperText={depositError}
                        />

                        {borrowerLegalName && (
                          <BorrowerIdentityDisclosure
                            legalName={borrowerLegalName}
                            alias={displayedBorrowerAlias}
                          />
                        )}

                        <Divider
                          sx={{
                            borderColor: COLORS.whiteLilac,
                          }}
                        />

                        <EarningsProjection
                          depositAmount={depositTokenAmount}
                          annualInterestBips={market.annualInterestBips}
                          underlyingToken={market.underlyingToken}
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        marginTop: "16px",
                        paddingX: "24px",
                        paddingBottom: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {isFixedTerm && (
                        <DepositAlert
                          text={
                            <Typography variant="mobText3">
                              <Trans
                                i18nKey="marketDetails.lender.modals.deposit.alerts.fixedTermLockedUntil"
                                values={{
                                  date: formatDate(fixedTermMaturity || 0),
                                }}
                                components={{
                                  underline: (
                                    <span
                                      style={{ textDecoration: "underline" }}
                                    />
                                  ),
                                }}
                              />
                            </Typography>
                          }
                          icon={
                            <SvgIcon
                              sx={{
                                fontSize: "16px",
                                "& path": { fill: COLORS.greySuit },
                                mt: "1px",
                              }}
                            >
                              <Clock />
                            </SvgIcon>
                          }
                        />
                      )}

                      {isFixedTerm && earlyTermination && (
                        <DepositAlert
                          text={
                            <Typography variant="mobText3">
                              {t(
                                "marketDetails.lender.modals.deposit.alerts.canRepayEarly",
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

                      {isFixedTerm && earlyMaturity && (
                        <DepositAlert
                          text={
                            <Typography variant="mobText3">
                              {t(
                                "marketDetails.lender.modals.deposit.alerts.canShortenDuration",
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

                      {mustResetAllowance && (
                        <DepositAlert
                          text={
                            <Typography variant="mobText3">
                              <Trans
                                i18nKey="marketDetails.lender.modals.deposit.alerts.resetAllowance"
                                values={{
                                  allowance: market.underlyingToken
                                    .getAmount(marketAccount.underlyingApproval)
                                    .format(
                                      market.underlyingToken.decimals,
                                      true,
                                    ),
                                  symbol: market.underlyingToken.symbol,
                                }}
                                components={{ break: <br /> }}
                              />
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
                    </Box>
                  </>
                )}
              </Box>
            </>
          )}

          {isDepositing && <LoadingModal txHash={txHash} />}
          {showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={() => {
                setShowErrorPopup(false)
                resetDeposit()
                modal.handleCloseModal()
              }}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal onClose={modal.handleCloseModal} txHash={txHash} />
          )}

          {showForm && (
            <Box
              sx={{
                flexShrink: 0,
                padding: "12px 0 24px",
                backgroundColor: COLORS.white,
              }}
            >
              {txHash !== "" && (
                <LinkGroup
                  type="etherscan"
                  linkValue={getTxUrl(txHash as string)}
                  groupSX={{ padding: "8px", marginBottom: "8px" }}
                />
              )}

              {gate.gateActive ? (
                <TxModalFooter
                  mainBtnText={t(
                    "marketDetails.lender.modals.deposit.gate.button",
                  )}
                  mainBtnOnClick={gate.accept}
                  disableMainBtn={!gate.acknowledged}
                  hideButtons={!showForm}
                />
              ) : (
                <TxModalFooter
                  mainBtnText={t(
                    "marketDetails.lender.transactions.deposit.button",
                  )}
                  secondBtnText={
                    // eslint-disable-next-line no-nested-ternary
                    isConnectedToSafe
                      ? undefined
                      : isApprovedButton
                        ? t("marketDetails.lender.modals.deposit.approved")
                        : t("marketDetails.lender.modals.deposit.approve")
                  }
                  secondBtnIcon={isApprovedButton && !isConnectedToSafe}
                  mainBtnOnClick={handleDeposit}
                  secondBtnOnClick={handleApprove}
                  disableMainBtn={disableDeposit}
                  disableSecondBtn={disableApprove}
                  secondBtnLoading={isApproving}
                  hideButtons={!showForm}
                />
              )}
            </Box>
          )}
        </Dialog>
      </>
    )

  return null
}
