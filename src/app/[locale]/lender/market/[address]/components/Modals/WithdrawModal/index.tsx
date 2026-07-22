import { ChangeEvent, useEffect, useMemo, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Tab, Tabs, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  HooksKind,
  QueueWithdrawalStatus,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

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
import { useWithdraw } from "@/app/[locale]/lender/market/[address]/hooks/useWithdraw"
import {
  useWithdrawFromWrapped,
  WrappedWithdrawStep,
} from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawFromWrapped"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { QueryKeys } from "@/config/query-keys"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useWrapperBalances } from "@/hooks/wrapper/useWrapperBalances"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { WithdrawModalProps } from "./interface"

enum WithdrawSource {
  Direct = "direct",
  Wrapped = "wrapped",
}

export const WithdrawModal = ({
  marketAccount,
  wrapper,
  hasWrapper,
  isMobileOpen,
  setIsMobileOpen,
}: WithdrawModalProps) => {
  const isMobile = useMobileResolution()

  const { t } = useTranslation()
  const { market } = marketAccount
  const { address } = useAccount()

  const notMature =
    market.hooksConfig?.kind === HooksKind.FixedTerm &&
    market.hooksConfig?.fixedTermEndTime !== undefined &&
    market.hooksConfig.fixedTermEndTime * 1000 >= Date.now()

  const [amount, setAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState<TokenAmount>()
  const [source, setSource] = useState<WithdrawSource>(WithdrawSource.Direct)
  const [wrappedStep, setWrappedStep] = useState<WrappedWithdrawStep>(
    WrappedWithdrawStep.Idle,
  )
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()

  // ---- wrapped position data ----
  const { data: wrapperBalances } = useWrapperBalances(
    market.chainId,
    wrapper,
    address,
  )
  const shareBalance = wrapperBalances?.shareBalance

  const canUseWrapped =
    !!hasWrapper && !!wrapper && !!shareBalance && !shareBalance.raw.isZero()
  const isWrapped = source === WithdrawSource.Wrapped

  // underlying market-token equivalent of the FULL wrapped position (display + Max)
  const { data: maxWrappedAssets } = useQuery({
    queryKey: QueryKeys.Wrapper.MAX_ASSETS_FROM_SHARES(
      wrapper?.address,
      shareBalance?.raw.toString(),
    ),
    enabled: !!wrapper && !!shareBalance && !shareBalance.raw.isZero(),
    queryFn: async () => {
      if (!wrapper || !shareBalance) throw new Error("no shares")
      return wrapper.previewRedeem(shareBalance)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  // shares parsed from the input string (wrapped mode)
  const shareInputAmount = useMemo(() => {
    if (!wrapper) return undefined
    try {
      return wrapper.shareToken.parseAmount((amount || "0").replace(/,/g, ""))
    } catch {
      return undefined
    }
  }, [wrapper, amount])

  // A = previewRedeem(shares): the exact market-token amount to withdraw/queue
  const { data: previewedAssets } = useQuery({
    queryKey: QueryKeys.Wrapper.PREVIEW(
      wrapper?.address,
      "unwrap-withdraw",
      "shares",
      shareInputAmount?.raw.toString(),
    ),
    enabled:
      isWrapped &&
      !!wrapper &&
      !!shareInputAmount &&
      !shareInputAmount.raw.isZero(),
    queryFn: async () => {
      if (!wrapper || !shareInputAmount) throw new Error("no input")
      return wrapper.previewRedeem(shareInputAmount)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const {
    mutate,
    isSuccess,
    isError,
    isPending,
    reset: resetDirect,
  } = useWithdraw(marketAccount, setTxHash, !!maxAmount)

  const wrappedWithdraw = useWithdrawFromWrapped(
    marketAccount,
    wrapper as TokenWrapper,
    setTxHash,
    setWrappedStep,
  )

  const pending = isPending || wrappedWithdraw.isPending
  const success = isSuccess || wrappedWithdraw.isSuccess
  const errored = isError || wrappedWithdraw.isError

  // Reset sticky mutation results + end-state popups. Called on open, on close,
  // and before starting a new withdraw so a previous success/error screen never
  // lingers behind a new attempt.
  const resetFinalStates = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setWrappedStep(WrappedWithdrawStep.Idle)
    setTxHash(undefined)
    resetDirect()
    wrappedWithdraw.reset()
  }

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const handleOpenModal = () => {
    resetFinalStates()
    setMaxAmount(undefined)
    modal.handleOpenModal()
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
    setMaxAmount(undefined)
  }

  const handleClickMaxAmount = () => {
    if (isWrapped) {
      if (shareBalance) {
        // 99.99% buffer avoids revert from scaleFactor drift on the exact-out withdraw
        setAmount(shareBalance.mulDiv(9999, 10000).format(5))
      }
      return
    }
    setAmount(parseFloat(marketAccount.marketBalance.format(5)).toString())
    setMaxAmount(marketAccount.marketBalance)
  }

  const handleSourceChange = (
    _evt: React.SyntheticEvent,
    next: WithdrawSource,
  ) => {
    setSource(next)
    setAmount("")
    setMaxAmount(undefined)
    setError(undefined)
  }

  const handleWithdraw = () => {
    resetFinalStates()
    if (isWrapped) {
      if (!previewedAssets || !canUseWrapped) return
      wrappedWithdraw.mutate(previewedAssets)
    } else {
      mutate(amount)
    }
  }

  const handleTryAgain = () => {
    handleWithdraw()
    setShowErrorPopup(false)
  }

  const smallestTokenAmountValue = market.underlyingToken.parseAmount(
    "0.00001".replace(/,/g, ""),
  )

  const isTooSmallMarketBalance: boolean =
    marketAccount.marketBalance.lt(smallestTokenAmountValue) &&
    !marketAccount.marketBalance.raw.isZero()

  const underlyingWithdrawAmount = useMemo(
    () =>
      marketAccount.market.underlyingToken.parseAmount(
        amount.replace(/,/g, "") || "0",
      ),
    [amount],
  )

  const handleClickTooSmallTextfield = () => {
    if (isTooSmallMarketBalance && maxAmount) {
      setMaxAmount(undefined)
    }
  }

  const withdrawAmount = maxAmount || underlyingWithdrawAmount

  const showForm = !(pending || showSuccessPopup || showErrorPopup)

  // ---- gating ----
  const wrappedTooBig =
    isWrapped &&
    !!shareInputAmount &&
    !!shareBalance &&
    shareInputAmount.gt(shareBalance)

  const wrappedStateNotReady =
    marketAccount.withdrawalAvailability !== QueueWithdrawalStatus.Ready

  const disableWithdrawDirect =
    !!error ||
    marketAccount.marketBalance.eq(0) ||
    withdrawAmount.gt(marketAccount.marketBalance) ||
    withdrawAmount.eq(0)

  const disableWithdrawWrapped =
    !canUseWrapped ||
    !previewedAssets ||
    previewedAssets.raw.isZero() ||
    wrappedTooBig ||
    wrappedStateNotReady

  const disableWithdraw = isWrapped
    ? disableWithdrawWrapped
    : disableWithdrawDirect

  const { status: withdrawStep } =
    marketAccount.previewQueueWithdrawal(withdrawAmount)

  const wrappedError = useMemo(() => {
    if (!isWrapped) return undefined
    if (wrappedTooBig)
      return `Insufficient ${wrapper?.shareToken.symbol ?? ""} balance`
    if (!shareInputAmount || shareInputAmount.raw.isZero()) return undefined
    if (marketAccount.withdrawalAvailability !== QueueWithdrawalStatus.Ready) {
      return SDK_ERRORS_MAPPING.queueWithdrawal[
        marketAccount.withdrawalAvailability
      ]
    }
    return undefined
  }, [isWrapped, wrappedTooBig, shareInputAmount, wrapper, marketAccount])

  const activeError = isWrapped ? wrappedError : error

  useEffect(() => {
    if (errored) {
      setShowErrorPopup(true)
    }
    if (success) {
      setShowSuccessPopup(true)
    }
  }, [errored, success])

  useEffect(() => {
    if (isWrapped) {
      setError(undefined)
      return
    }
    if (amount === "" || amount === "0" || withdrawStep === "Ready") {
      setError(undefined)
      return
    }

    setError(SDK_ERRORS_MAPPING.queueWithdrawal[withdrawStep])
  }, [amount, withdrawStep, isWrapped])

  // default to the wrapped position when the lender holds no direct balance
  useEffect(() => {
    if (marketAccount.marketBalance.raw.isZero() && canUseWrapped) {
      setSource(WithdrawSource.Wrapped)
    }
  }, [canUseWrapped])

  const { open, closedModalStep } = modal

  useEffect(() => {
    setMaxAmount(undefined)
  }, [open, closedModalStep])

  useEffect(() => {
    if (isMobileOpen) {
      resetFinalStates()
      modal.setFlowStep(ModalSteps.gettingValues)
    }
  }, [isMobileOpen])

  const handleModalArrowClick = () => {
    if (modal.gettingValueStep && !!setIsMobileOpen) {
      setIsMobileOpen(false)
    }
    modal.handleClickBack()
  }

  const handleCloseDesktopModal = () => {
    resetFinalStates()
    modal.handleCloseModal()
  }

  const handleCloseMobileModal = () => {
    if (setIsMobileOpen) {
      resetFinalStates()
      modal.handleCloseModal()
      setIsMobileOpen(false)
    }
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 50
    if (showSuccessPopup) return 100

    return 0
  }

  // ---- mode-aware display values ----
  const marketSymbol = market.underlyingToken.symbol

  const directAvailableDisplay = isTooSmallMarketBalance
    ? `< 0.00001 ${marketSymbol}`
    : `${formatTokenWithCommas(marketAccount.marketBalance)} ${marketSymbol}`

  const wrappedAvailableDisplay =
    shareBalance && wrapper
      ? `${formatTokenWithCommas(shareBalance)} ${wrapper.shareToken.symbol}`
      : "-"

  const wrappedEquivalentDisplay = maxWrappedAssets
    ? `≈ ${formatTokenWithCommas(maxWrappedAssets)} ${marketSymbol}`
    : ""

  const fieldLabel = isWrapped
    ? t("lenderMarketDetails.transactions.withdraw.wrapped.inputLabel")
    : `Up to ${formatTokenWithCommas(
        marketAccount.marketBalance,
      )} ${marketSymbol}`

  const wrappedInputHint =
    isWrapped && previewedAssets
      ? `≈ ${formatTokenWithCommas(previewedAssets)} ${marketSymbol} ${t(
          "lenderMarketDetails.transactions.withdraw.wrapped.toWithdraw",
        )}`
      : undefined

  const confirmedAmount = isWrapped
    ? previewedAssets
    : maxAmount || underlyingWithdrawAmount

  const successTitle = t(
    "lenderMarketDetails.transactions.withdraw.success.title",
  )
  const successSubtitle = t(
    "lenderMarketDetails.transactions.withdraw.success.subtitle",
    {
      amount: confirmedAmount ? formatTokenWithCommas(confirmedAmount) : "",
      symbol: marketSymbol,
    },
  )

  const wrappedLoadingSubtitle =
    wrappedStep === WrappedWithdrawStep.Queueing
      ? t("lenderMarketDetails.transactions.withdraw.wrapped.step.queueing")
      : t("lenderMarketDetails.transactions.withdraw.wrapped.step.unwrapping")
  const loadingSubtitle = isWrapped ? wrappedLoadingSubtitle : undefined

  const showSmallBalanceOverlay =
    !isWrapped && isTooSmallMarketBalance && !!maxAmount

  const sourceToggle = canUseWrapped ? (
    <Tabs
      value={source}
      onChange={handleSourceChange}
      className="contained"
      aria-label="withdraw source"
      sx={{ width: "100%" }}
    >
      <Tab
        value={WithdrawSource.Direct}
        label={t("lenderMarketDetails.transactions.withdraw.source.direct")}
        className="contained"
        sx={{ width: "50%" }}
      />
      <Tab
        value={WithdrawSource.Wrapped}
        label={t("lenderMarketDetails.transactions.withdraw.source.wrapped")}
        className="contained"
        sx={{ width: "50%" }}
      />
    </Tabs>
  ) : null

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
            label={t("lenderMarketDetails.transactions.withdraw.modal.title")}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : handleModalArrowClick
            }
            crossOnClick={handleCloseMobileModal}
            progress={progressAmount()}
          />

          <Box
            sx={{
              padding: "32px 20px 0",
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.white,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="text2" lineHeight="24px">
              Choose amount of tokens
            </Typography>

            {sourceToggle && (
              <Box sx={{ marginTop: "16px" }}>{sourceToggle}</Box>
            )}

            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              lineHeight="24px"
              sx={{ marginTop: sourceToggle ? "16px" : 0 }}
            >
              {isWrapped ? "Wrapped position" : "Available to withdraw"}{" "}
              <Typography
                variant="text3"
                lineHeight="24px"
                color={COLORS.ultramarineBlue}
              >
                {isWrapped ? wrappedAvailableDisplay : directAvailableDisplay}
              </Typography>
            </Typography>

            {isWrapped && wrappedEquivalentDisplay && (
              <Typography
                variant="text3"
                lineHeight="20px"
                color={COLORS.santasGrey}
              >
                {wrappedEquivalentDisplay}
              </Typography>
            )}

            <Box>
              <NumberTextField
                label={fieldLabel}
                size="medium"
                style={{
                  width: "100%",
                  marginTop: "12px",
                  marginBottom: wrappedInputHint ? "8px" : "24px",
                }}
                value={amount}
                onChange={handleAmountChange}
                onClick={
                  showSmallBalanceOverlay
                    ? handleClickTooSmallTextfield
                    : undefined
                }
                endAdornment={
                  <TextfieldButton
                    buttonText="Max"
                    onClick={handleClickMaxAmount}
                  />
                }
                error={!!activeError}
                helperText={activeError}
              />
              {wrappedInputHint && (
                <Typography
                  variant="text3"
                  color={COLORS.santasGrey}
                  sx={{ marginBottom: "16px", display: "block" }}
                >
                  {wrappedInputHint}
                </Typography>
              )}
              {showSmallBalanceOverlay && (
                <Box
                  sx={{
                    width: "fit-content",
                    backgroundColor: COLORS.white,
                    padding: "2px",
                    position: "relative",
                    bottom: "36.7px",
                    left: "14px",
                  }}
                >
                  <Typography variant="text2">{"< 0.00001"}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <TxModalFooter
            mainBtnText={t(
              "lenderMarketDetails.transactions.withdraw.modal.buttons.confirm",
            )}
            mainBtnOnClick={handleWithdraw}
            disableMainBtn={disableWithdraw}
            hideButtons={!showForm}
          />
        </Box>

        <Dialog
          open={pending || showErrorPopup || showSuccessPopup}
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
          {pending && (
            <LoadingModal txHash={txHash} subtitle={loadingSubtitle} />
          )}
          {!pending && showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={handleCloseMobileModal}
              txHash={txHash}
            />
          )}
          {!pending && !showErrorPopup && showSuccessPopup && (
            <SuccessModal
              onClose={handleCloseMobileModal}
              txHash={txHash}
              title={successTitle}
              subtitle={successSubtitle}
            />
          )}
        </Dialog>
      </>
    )

  return (
    <>
      <Button
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        onClick={handleOpenModal}
        disabled={notMature}
      >
        {notMature
          ? t("lenderMarketDetails.transactions.withdraw.buttonLocked")
          : t("lenderMarketDetails.transactions.withdraw.button")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={pending ? undefined : handleCloseDesktopModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <>
            <TxModalHeader
              title={t("lenderMarketDetails.transactions.withdraw.modal.title")}
              arrowOnClick={
                modal.hideArrowButton || !showForm
                  ? null
                  : modal.handleClickBack
              }
              crossOnClick={
                modal.hideCrossButton ? null : handleCloseDesktopModal
              }
            />

            <Box width="100%" height="100%" padding="0 24px">
              {sourceToggle}

              <Box sx={TxModalInfoItem} marginTop="24px" padding="0 16px">
                <Typography variant="text3" sx={TxModalInfoTitle}>
                  {isWrapped
                    ? t(
                        "lenderMarketDetails.transactions.withdraw.wrapped.available",
                      )
                    : t(
                        "lenderMarketDetails.transactions.withdraw.modal.available",
                      )}
                </Typography>
                <Typography variant="text3">
                  {isWrapped ? wrappedAvailableDisplay : directAvailableDisplay}
                </Typography>
              </Box>

              <NumberTextField
                label={fieldLabel}
                size="medium"
                style={{ width: "100%", marginTop: "20px" }}
                value={amount}
                onChange={handleAmountChange}
                onClick={
                  showSmallBalanceOverlay
                    ? handleClickTooSmallTextfield
                    : undefined
                }
                endAdornment={
                  <TextfieldButton
                    buttonText="Max"
                    onClick={handleClickMaxAmount}
                  />
                }
                error={!!activeError}
                helperText={activeError}
              />

              {wrappedInputHint && (
                <Typography
                  variant="text4"
                  color={COLORS.santasGrey}
                  sx={{ marginTop: "8px", padding: "0 4px", display: "block" }}
                >
                  {wrappedInputHint}
                </Typography>
              )}

              {showSmallBalanceOverlay && (
                <Box
                  sx={{
                    width: "fit-content",
                    backgroundColor: COLORS.white,
                    padding: "2px",
                    position: "relative",
                    bottom: "36.7px",
                    left: "14px",
                  }}
                >
                  <Typography variant="text2">{"< 0.00001"}</Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {pending && <LoadingModal txHash={txHash} subtitle={loadingSubtitle} />}
        {!pending && showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={handleCloseDesktopModal}
            txHash={txHash}
          />
        )}
        {!pending && !showErrorPopup && showSuccessPopup && (
          <SuccessModal
            onClose={handleCloseDesktopModal}
            txHash={txHash}
            title={successTitle}
            subtitle={successSubtitle}
          />
        )}

        <TxModalFooter
          mainBtnText={t(
            "lenderMarketDetails.transactions.withdraw.modal.buttons.confirm",
          )}
          mainBtnOnClick={handleWithdraw}
          disableMainBtn={disableWithdraw}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
