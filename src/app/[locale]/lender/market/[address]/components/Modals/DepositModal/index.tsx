import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

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
import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  DepositStatus,
  Signer,
  HooksKind,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

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
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { toastError } from "@/components/Toasts"
import { TooltipButton } from "@/components/TooltipButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useDepositAgreementGate } from "@/hooks/useDepositAgreementGate"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { createClientFlowSession } from "@/lib/telemetry/clientFlow"
import { COLORS } from "@/theme/colors"
import {
  hasManuallyDisabledMarketActions,
  isUSDTLikeToken,
} from "@/utils/constants"
import { fillMaxDepositInput } from "@/utils/depositMaxFill"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import {
  formatTokenWithCommas,
  formatUtcMaturity,
  localize,
  TOKEN_FORMAT_DECIMALS,
} from "@/utils/formatters"

import { EarningsProjection } from "./EarningsProjection"
import { DepositModalProps } from "./interface"
import { useDepositGate } from "./useDepositGate"
import { useDeposit } from "../../../hooks/useDeposit"
import { NonMlaAcknowledgementModal } from "../NonMlaAcknowledgementModal"

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
      label: t("borrowerProfile.profile.overallInfo.name"),
      value: legalName,
    },
    ...(alias
      ? [
          {
            label: t("borrowerProfile.profile.overallInfo.alias"),
            value: alias,
          },
        ]
      : []),
  ]

  return (
    <Box>
      <Typography variant={isMobile ? "mobText2" : "text1"}>
        Depositing to the following Borrower:
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
  const { address: connectedAddress } = useAccount()
  // ToU re-acceptance lockout (staleExpired / declined): deposits blocked.
  const {
    touGateState,
    isWrongNetwork,
    isSelectionMismatch,
    isAgreementFetching,
    refetchAgreementStatus,
  } = useNetworkGate({
    desiredChainId: market.chainId,
  })
  const touActionBlocked = touGateState !== "unblocked"
  // The status fetch failed (not merely in flight): let the button through so
  // its click can retry the fetch instead of dead-ending on a disabled state.
  const touRetryAvailable = touGateState === "unknown" && !isAgreementFetching
  const networkActionBlocked = isWrongNetwork || isSelectionMismatch
  const accountActionBlocked =
    !connectedAddress ||
    connectedAddress.toLowerCase() !== marketAccount.account.toLowerCase()

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
  // The Max fill currently standing in the field: its display string plus the
  // exact TokenAmount behind it, so the deposit carries the true value rather
  // than its five-decimal rendering. Null while the lender types their own
  // amount. (product#608)
  const [maxFill, setMaxFill] = useState<{
    display: string
    amount: TokenAmount
  } | null>(null)

  // Every reset path has to drop the Max fill along with the string, or the
  // field would keep displaying the fill over a cleared amount.
  const resetAmount = useCallback<Dispatch<SetStateAction<string>>>((value) => {
    setMaxFill(null)
    setAmount(value)
  }, [])

  const [depositError, setDepositError] = useState<string | undefined>()

  const { connected: isConnectedToSafe } = useSafeAppsSDK()
  const flowSessionRef = useRef(createClientFlowSession())

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>("")

  const {
    mutate: deposit,
    isPending: isDepositing,
    isSuccess: isDeposed,
    isError: isDepositError,
    reset: resetDeposit,
  } = useDeposit(marketAccount, setTxHash, () =>
    flowSessionRef.current.getParentContext(),
  )

  const { mutateAsync: approve, isPending: isApproving } = useApprove(
    market.underlyingToken,
    market,
    setTxHash,
    () => flowSessionRef.current.getParentContext(),
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    resetAmount,
    setTxHash,
  )

  const gate = useDepositGate({
    required: !!showBorrowerPenaltyWarning,
    isModalOpen: modal.isModalOpen || !!isMobileOpen,
  })

  const agreementGate = useDepositAgreementGate(market.address, market.chainId)
  const [isNonMlaAcknowledgementOpen, setIsNonMlaAcknowledgementOpen] =
    useState(false)
  const [depositOpenRequested, setDepositOpenRequested] = useState(false)
  const awaitingAcknowledgementRefresh = useRef(false)
  const previousConnectedAddress = useRef(connectedAddress?.toLowerCase())
  const agreementActionBlocked = agreementGate.state !== "satisfied"

  // The fillable maximum, read fresh every render so it tracks the market
  // poll. Null when there is nothing worth filling, which is also what hides
  // the Max control.
  const maxDepositAmount = marketAccount.maximumDeposit
  const maxDepositFill = fillMaxDepositInput(maxDepositAmount)
  const showMaxButton = maxDepositFill !== null
  // The maximum as a primitive, so the re-sync below reacts to movements too
  // small to disturb the five-decimal display string. Interest accrual shrinks
  // a capacity-bound maximum by far less than that on every poll, and a fill
  // left a hair above it fails ExceedsMaximumDeposit with no visible cause.
  const maxDepositRaw = maxDepositAmount.raw.toString()

  // user inputted amount
  const parsedDepositAmount = useMemo(
    () => marketAccount.market.underlyingToken.parseAmount(amount || "0"),
    [amount, marketAccount.market.underlyingToken],
  )
  // A standing Max fill carries the exact amount; `amount` holds its display
  // form, so the transaction deposits the true value and the field still
  // shows the five-decimal rendering.
  const depositTokenAmount = maxFill ? maxFill.amount : parsedDepositAmount
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
    resetAmount(value)
  }

  const handleClickMaxAmount = () => {
    if (maxDepositFill === null) return
    setAmount(maxDepositFill)
    setMaxFill({ display: maxDepositFill, amount: maxDepositAmount })
  }

  const handleOpenDepositModal = () => {
    if (touRetryAvailable) {
      toastError("Couldn't verify Terms of Use status — retrying")
      refetchAgreementStatus().catch(() => undefined)
      return
    }
    // ToU re-acceptance lockout: deposits are blocked until the current
    // version is accepted (withdrawals stay available).
    if (touActionBlocked || networkActionBlocked || accountActionBlocked) return

    if (agreementGate.state === "error") {
      setDepositOpenRequested(false)
      toastError("Couldn't load agreement data — retrying")
      agreementGate.retry().catch(() => undefined)
      return
    }

    if (agreementGate.state === "loading") {
      setDepositOpenRequested(true)
      return
    }

    if (agreementGate.state === "requires-mla-signature") {
      return
    }

    if (agreementGate.state === "requires-non-mla-acknowledgement") {
      setIsNonMlaAcknowledgementOpen(true)
      return
    }

    modal.handleOpenModal()
  }

  const mustResetAllowance =
    !isAllowanceSufficient &&
    marketAccount.underlyingApproval.gt(0) &&
    isUSDTLikeToken(market.underlyingToken.address)

  const disableApprove =
    touActionBlocked ||
    networkActionBlocked ||
    accountActionBlocked ||
    agreementActionBlocked ||
    marketActionsManuallyDisabled ||
    !borrowerLegalName ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    isAllowanceSufficient ||
    isApproving ||
    !Signer.isSigner(market.provider)

  const disableDeposit =
    touActionBlocked ||
    networkActionBlocked ||
    accountActionBlocked ||
    agreementActionBlocked ||
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

  const capacityTooltip = underlyingBalanceIsZero
    ? "Underlying token balance is zero"
    : "Market is at full capacity"
  let tooltip = capacityTooltip
  if (touGateState === "blocked") {
    tooltip = "Accept the Terms of Use to deposit"
  } else if (touGateState === "unknown") {
    tooltip = isAgreementFetching
      ? "Checking Terms of Use status"
      : "Couldn't verify Terms of Use status — tap to retry"
  } else if (networkActionBlocked) {
    tooltip = "Switch to the market network to deposit"
  } else if (agreementGate.state === "error") {
    tooltip = "Tap to retry loading agreement data"
  }

  // The market account polls, so the maximum moves under an open modal
  // whenever another lender deposits, the borrower changes capacity, or the
  // wallet balance shifts. Follow it while the fill is untouched, or the
  // field would contradict the "Available to deposit" row directly above it
  // and "Max" would stop meaning max. Held still while a transaction is in
  // flight so the amount cannot move out from under a signature.
  useEffect(() => {
    if (!maxFill || isApproving || isDepositing) return
    if (maxDepositFill === null) {
      resetAmount("")
      return
    }
    if (maxFill.amount.raw.toString() === maxDepositRaw) return
    setMaxFill({ display: maxDepositFill, amount: maxDepositAmount })
    setAmount(maxDepositFill)
    // maxDepositAmount is rebuilt on every render (marketAccount.maximumDeposit
    // is a getter over an object the poll mutates in place), so it cannot be a
    // dependency; maxDepositRaw is its stable primitive form and gates the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    maxFill,
    maxDepositFill,
    maxDepositRaw,
    isApproving,
    isDepositing,
    resetAmount,
  ])

  const ensureFlowContext = () =>
    flowSessionRef.current.startFlowSpan(
      "deposit.flow",
      {
        "market.address": market.address,
        "market.chain_id": market.chainId,
        "token.address": market.underlyingToken.address,
        "token.symbol": market.underlyingToken.symbol,
        "token.amount": depositTokenAmount.raw.toString(),
        "safe.connected": isConnectedToSafe,
      },
      {
        pageLink: true,
      },
    )

  const endFlowSpan = (outcome: "success" | "error" | "cancelled") => {
    flowSessionRef.current.endFlowSpan(outcome, {
      "flow.outcome": outcome,
      "token.amount": depositTokenAmount.raw.toString(),
    })
  }

  const handleDeposit = () => {
    if (
      marketActionsManuallyDisabled ||
      touActionBlocked ||
      networkActionBlocked ||
      accountActionBlocked ||
      agreementActionBlocked
    )
      return

    setTxHash("")
    const flowContext = ensureFlowContext()
    if (flowContext) {
      context.with(flowContext, () => deposit(depositTokenAmount))
    } else {
      deposit(depositTokenAmount)
    }
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleDeposit()
  }

  const handleApprove = () => {
    if (
      marketActionsManuallyDisabled ||
      touActionBlocked ||
      networkActionBlocked ||
      accountActionBlocked ||
      agreementActionBlocked
    )
      return

    setTxHash("")

    if (!isAllowanceSufficient) {
      const flowContext = ensureFlowContext()
      if (
        marketAccount.underlyingApproval.gt(0) &&
        isUSDTLikeToken(market.underlyingToken.address)
      ) {
        const runApprovals = () =>
          approve(depositTokenAmount.token.getAmount(0)).then(() => {
            approve(depositTokenAmount).then(() => {
              if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
                setAmount("")
              }
            })
          })
        if (flowContext) {
          context.with(flowContext, runApprovals)
        } else {
          runApprovals()
        }
      } else {
        const runApproval = () =>
          approve(depositTokenAmount).then(() => {
            if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
              setAmount("")
            }
          })
        if (flowContext) {
          context.with(flowContext, runApproval)
        } else {
          runApproval()
        }
      }
    }
  }

  useEffect(() => {
    if (amount === "" || amount === "0" || depositStep === "Ready") {
      setDepositError(undefined)
      return
    }

    if (depositStep === "InsufficientBalance") {
      if (isAllowanceSufficient) {
        // approval is sufficient but balance too low to deposit this amount
        setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
      } else {
        // warn that this is above balance but you can approve if you want to
        setDepositError(
          "Amount exceeds wallet balance. You can still approve for future use",
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
  ])

  useEffect(() => {
    if (isMobileOpen) {
      handleOpenDepositModal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileOpen])

  useEffect(() => {
    if (
      touActionBlocked ||
      networkActionBlocked ||
      accountActionBlocked ||
      agreementGate.state === "error"
    ) {
      if (depositOpenRequested) setDepositOpenRequested(false)
      awaitingAcknowledgementRefresh.current = false
      return
    }

    if (!depositOpenRequested || agreementGate.state === "loading") {
      return
    }

    setDepositOpenRequested(false)
    if (agreementGate.state === "requires-mla-signature") return

    if (agreementGate.state === "satisfied") {
      awaitingAcknowledgementRefresh.current = false
      modal.handleOpenModal()
      return
    }

    if (awaitingAcknowledgementRefresh.current) return
    setIsNonMlaAcknowledgementOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountActionBlocked,
    depositOpenRequested,
    agreementGate.state,
    networkActionBlocked,
    touActionBlocked,
  ])

  // Agreement and ToU authorization are account-scoped. If either changes
  // while this modal is open, stop the old account's in-progress action.
  useEffect(() => {
    if (!modal.isModalOpen && !isMobileOpen) return
    if (
      !touActionBlocked &&
      !networkActionBlocked &&
      !accountActionBlocked &&
      !awaitingAcknowledgementRefresh.current &&
      agreementGate.state === "requires-non-mla-acknowledgement"
    ) {
      modal.handleCloseModal()
      setIsNonMlaAcknowledgementOpen(true)
      return
    }
    if (
      touActionBlocked ||
      networkActionBlocked ||
      accountActionBlocked ||
      agreementGate.state !== "satisfied"
    ) {
      modal.handleCloseModal()
      if (setIsMobileOpen) setIsMobileOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountActionBlocked,
    agreementGate.state,
    isMobileOpen,
    networkActionBlocked,
    touActionBlocked,
  ])

  useEffect(() => {
    const currentAddress = connectedAddress?.toLowerCase()
    if (previousConnectedAddress.current === currentAddress) return
    previousConnectedAddress.current = currentAddress
    setDepositOpenRequested(false)
    setIsNonMlaAcknowledgementOpen(false)
    awaitingAcknowledgementRefresh.current = false
    resetAmount("")
    setTxHash("")
    gate.reset()
    resetDeposit()
    modal.handleCloseModal()
    if (setIsMobileOpen) setIsMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress])

  useEffect(() => {
    if (isDepositError) {
      setShowErrorPopup(true)
    }
    if (isDeposed) {
      endFlowSpan("success")
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
    endFlowSpan("cancelled")
    if (setIsMobileOpen) {
      setIsMobileOpen(false)
    }
  }

  const handleCloseDesktopModal = () => {
    modal.handleCloseModal()
    endFlowSpan("cancelled")
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 33
    if (isDepositing) return 66
    if (showSuccessPopup) return 100

    return 0
  }

  const acknowledgementModal = (
    <NonMlaAcknowledgementModal
      open={isNonMlaAcknowledgementOpen}
      marketAddress={market.address}
      marketName={market.name}
      borrowerAddress={market.borrower}
      chainId={market.chainId}
      onClose={() => {
        setIsNonMlaAcknowledgementOpen(false)
        setDepositOpenRequested(false)
        if (setIsMobileOpen) setIsMobileOpen(false)
      }}
      onAcknowledged={() => {
        setIsNonMlaAcknowledgementOpen(false)
        awaitingAcknowledgementRefresh.current = true
        setDepositOpenRequested(true)
      }}
    />
  )

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
            label={t("lenderMarketDetails.transactions.deposit.modal.title")}
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
                  label={t(
                    "lenderMarketDetails.transactions.deposit.modal.gate.checkbox",
                  )}
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
                        Choose deposit amount
                      </Typography>

                      {minimumDeposit && (
                        <Typography
                          color={COLORS.santasGrey}
                          variant="mobText3"
                        >
                          Minimum deposit{" "}
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
                        Available to deposit{" "}
                        <Typography
                          variant="mobText3"
                          color={COLORS.ultramarineBlue}
                        >
                          {localize(
                            maxDepositAmount,
                            TOKEN_FORMAT_DECIMALS,
                            true,
                          )}
                        </Typography>
                      </Typography>

                      <NumberTextField
                        label={localize(maxDepositAmount)}
                        size="medium"
                        style={{
                          width: "100%",
                          marginTop: "12px",
                          marginBottom: "24px",
                        }}
                        value={amount}
                        onChange={handleAmountChange}
                        endAdornment={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {showMaxButton && (
                              <TextfieldButton
                                buttonText="Max"
                                onClick={handleClickMaxAmount}
                                disabled={isApproving}
                              />
                            )}
                            <TextfieldChip
                              text={market.underlyingToken.symbol}
                              size="small"
                            />
                          </Box>
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
                            This is a fixed-term market: funds are locked until{" "}
                            <span style={{ textDecoration: "underline" }}>
                              {formatUtcMaturity(fixedTermMaturity || 0)}
                            </span>{" "}
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
                            The market can be repaid early to close
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
                            The market’s duration can be shorten
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
                            You have an existing allowance of{" "}
                            {market.underlyingToken
                              .getAmount(marketAccount.underlyingApproval)
                              .format(
                                market.underlyingToken.decimals,
                                true,
                              )}{" "}
                            for this market.
                            <br />
                            {market.underlyingToken.symbol} requires that
                            allowances be reset to zero prior to being
                            increased.
                            <br />
                            You will be prompted to execute two approval
                            transactions to first reset and then increase the
                            allowance for this market.
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
                  "lenderMarketDetails.transactions.deposit.modal.gate.button",
                )}
                mainBtnOnClick={gate.accept}
                disableMainBtn={!gate.acknowledged}
                hideButtons={!showForm}
              />
            ) : (
              <TxModalFooter
                mainBtnText={t(
                  "lenderMarketDetails.transactions.deposit.button",
                )}
                secondBtnText={
                  // eslint-disable-next-line no-nested-ternary
                  isConnectedToSafe
                    ? undefined
                    : isApprovedButton
                      ? "Approved"
                      : "Approve"
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
                endFlowSpan("error")
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
                endFlowSpan("success")
                if (setIsMobileOpen) setIsMobileOpen(false)
              }}
              txHash={txHash}
            />
          )}
        </Dialog>
        {acknowledgementModal}
      </>
    )

  if (!isMobile)
    return (
      <>
        {touActionBlocked ||
        networkActionBlocked ||
        agreementGate.state === "error" ||
        marketAccount.maximumDeposit.raw.isZero() ||
        underlyingBalanceIsZero ? (
          <Tooltip title={tooltip} placement="right">
            <Box sx={{ display: "flex" }}>
              <Button
                onClick={handleOpenDepositModal}
                variant="contained"
                size="large"
                sx={{ width: "152px" }}
                disabled={
                  (touActionBlocked && !touRetryAvailable) ||
                  networkActionBlocked ||
                  accountActionBlocked ||
                  marketActionsManuallyDisabled ||
                  marketAccount.maximumDeposit.raw.isZero() ||
                  underlyingBalanceIsZero
                }
              >
                {t("lenderMarketDetails.transactions.deposit.button")}
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <Button
            onClick={handleOpenDepositModal}
            variant="contained"
            size="large"
            sx={{ width: "152px" }}
            disabled={
              marketActionsManuallyDisabled ||
              networkActionBlocked ||
              accountActionBlocked ||
              marketAccount.maximumDeposit.raw.isZero() ||
              underlyingBalanceIsZero
            }
          >
            {t("lenderMarketDetails.transactions.deposit.button")}
          </Button>
        )}

        <Dialog
          open={modal.isModalOpen}
          onClose={isDepositing ? undefined : handleCloseDesktopModal}
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
                  title={t(
                    "lenderMarketDetails.transactions.deposit.modal.title",
                  )}
                  arrowOnClick={
                    modal.hideArrowButton || !showForm
                      ? null
                      : modal.handleClickBack
                  }
                  crossOnClick={
                    modal.hideCrossButton ? null : handleCloseDesktopModal
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
                        {t(
                          "lenderMarketDetails.transactions.deposit.modal.gate.heading",
                        )}
                      </Typography>

                      <TooltipButton
                        value={t(
                          "lenderMarketDetails.transactions.deposit.modal.gate.tooltip",
                        )}
                      />
                    </Box>

                    <FormControlLabel
                      label={t(
                        "lenderMarketDetails.transactions.deposit.modal.gate.checkbox",
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
                          Choose deposit amount
                        </Typography>

                        {minimumDeposit && (
                          <Typography
                            sx={{ mb: "4px" }}
                            color={COLORS.santasGrey}
                            variant="text3"
                            lineHeight="24px"
                          >
                            Minimum deposit{" "}
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
                          Available to deposit{" "}
                          <Typography
                            variant="text3"
                            lineHeight="24px"
                            color={COLORS.ultramarineBlue}
                          >
                            {localize(
                              maxDepositAmount,
                              TOKEN_FORMAT_DECIMALS,
                              true,
                            )}
                          </Typography>
                        </Typography>

                        <NumberTextField
                          label={localize(maxDepositAmount)}
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
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {showMaxButton && (
                                <TextfieldButton
                                  buttonText="Max"
                                  onClick={handleClickMaxAmount}
                                  disabled={isApproving}
                                />
                              )}
                              <TextfieldChip
                                text={market.underlyingToken.symbol}
                                size="small"
                              />
                            </Box>
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
                              This is a fixed-term market: funds are locked
                              until{" "}
                              <span style={{ textDecoration: "underline" }}>
                                {formatUtcMaturity(fixedTermMaturity || 0)}
                              </span>{" "}
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
                              The market can be repaid early to close
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
                              The market’s duration can be shorten
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
                              You have an existing allowance of{" "}
                              {market.underlyingToken
                                .getAmount(marketAccount.underlyingApproval)
                                .format(
                                  market.underlyingToken.decimals,
                                  true,
                                )}{" "}
                              for this market.
                              <br />
                              {market.underlyingToken.symbol} requires that
                              allowances be reset to zero prior to being
                              increased.
                              <br />
                              You will be prompted to execute two approval
                              transactions to first reset and then increase the
                              allowance for this market.
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
                endFlowSpan("error")
              }}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal
              onClose={() => {
                modal.handleCloseModal()
                endFlowSpan("success")
              }}
              txHash={txHash}
            />
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
                    "lenderMarketDetails.transactions.deposit.modal.gate.button",
                  )}
                  mainBtnOnClick={gate.accept}
                  disableMainBtn={!gate.acknowledged}
                  hideButtons={!showForm}
                />
              ) : (
                <TxModalFooter
                  mainBtnText={t(
                    "lenderMarketDetails.transactions.deposit.button",
                  )}
                  secondBtnText={
                    // eslint-disable-next-line no-nested-ternary
                    isConnectedToSafe
                      ? undefined
                      : isApprovedButton
                        ? "Approved"
                        : "Approve"
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
        {acknowledgementModal}
      </>
    )

  return null
}
