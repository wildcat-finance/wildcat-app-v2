import { Dispatch, SetStateAction } from "react"
import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import {
  DepositStatus,
  MarketAccount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { useFaucet } from "@/app/[locale]/lender/market/[address]/hooks/useFaucet"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import {
  LenderAccessState,
  resolveLenderActionState,
  resolveLenderWithdrawalActionState,
} from "@/app/[locale]/lender/market/[address]/utils"
import Clock from "@/assets/icons/clock_icon.svg"
import { toastError } from "@/components/Toasts"
import { TooltipButton } from "@/components/TooltipButton"
import { WITHDRAWAL_UNAVAILABLE_KEY } from "@/constants/i18nKeys"
import { useDepositAgreementGate } from "@/hooks/useDepositAgreementGate"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useWrapperAccountState } from "@/hooks/wrapper/useWrapperAccountState"
import { COLORS } from "@/theme/colors"
import { hasManuallyDisabledMarketActions } from "@/utils/constants"
import { formatTokenWithCommas } from "@/utils/formatters"
import {
  formatPeriodicWithdrawalWindowStart,
  getPeriodicWindowTiming,
  isPeriodicWithdrawalWindowClosed,
} from "@/utils/periodicWithdrawalWindow"

export type MobileMarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
  accessState: LenderAccessState
  wrapper?: TokenWrapper
  hasWrapper?: boolean
  isMobileWithdrawalOpen: boolean
  setIsMobileDepositOpen: Dispatch<SetStateAction<boolean>>
  setIsMobileAcknowledgementOpen: Dispatch<SetStateAction<boolean>>
  setIsMobileWithdrawalOpen: Dispatch<SetStateAction<boolean>>
  isMLAOpen: boolean
  setIsMLAOpen: Dispatch<SetStateAction<boolean>>
}

export type MobileMarketTransactionItemProps = {
  title: string
  tooltip?: string
  amount: string | undefined
  asset: string
}

const MobileMarketTransactionItem = ({
  title,
  tooltip,
  amount,
  asset,
}: MobileMarketTransactionItemProps) => (
  <>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "2px",
      }}
    >
      <Typography variant="mobText3" sx={{ color: COLORS.santasGrey }}>
        {title}
      </Typography>
      {tooltip && <TooltipButton value={tooltip} />}
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "4px",
      }}
    >
      <Typography
        variant="mobH3"
        sx={{ fontSize: "18px", lineHeight: "24px" }}
        color={COLORS.white}
      >
        {amount}
      </Typography>
      <Typography
        color={COLORS.white}
        variant="mobText4"
        sx={{
          marginTop: "1px",
        }}
      >
        {asset}
      </Typography>
    </Box>
  </>
)

const MobileDepositStatus = ({ text }: { text: string }) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      gap: "4px",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "16px",
    }}
  >
    <SvgIcon
      sx={{
        fontSize: "12px",
        "& path": { fill: COLORS.white06 },
      }}
    >
      <Clock />
    </SvgIcon>
    <Typography variant="mobText3" color={COLORS.white06} textAlign="center">
      {text}
    </Typography>
  </Box>
)

export const MobileFaucetButton = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const {
    mutate: faucet,
    isPending: isFauceting,
    isSuccess,
  } = useFaucet(marketAccount)

  if (isSuccess) return null

  return (
    <Button
      onClick={() => faucet()}
      variant="contained"
      color="secondary"
      size="large"
      fullWidth
      disabled={isFauceting}
      sx={{ padding: "10px 20px", marginTop: "16px" }}
    >
      {isFauceting
        ? t("marketDetails.lender.faucet.requesting")
        : t("marketDetails.lender.faucet.button")}
    </Button>
  )
}

export const MobileMarketActions = ({
  marketAccount,
  withdrawals,
  accessState,
  wrapper,
  hasWrapper,
  isMobileWithdrawalOpen,
  setIsMobileWithdrawalOpen,
  setIsMobileDepositOpen,
  setIsMobileAcknowledgementOpen,
  isMLAOpen,
  setIsMLAOpen,
}: MobileMarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { address } = useAccount()
  const { publicClient } = useEthersProvider({ chainId: market.chainId })
  const { data: wrapperAccountState } = useWrapperAccountState(
    market.chainId,
    wrapper,
    address,
    publicClient,
  )
  const wrappedCap =
    hasWrapper && wrapper ? wrapperAccountState?.limits?.maxWithdraw : undefined
  const hasWrappedPosition =
    !!wrappedCap &&
    wrappedCap.gte(market.underlyingToken.parseAmount("0.00001"))
  const wrappedAvailable = hasWrappedPosition ? wrappedCap : undefined
  const combinedAvailable = wrappedAvailable
    ? marketAccount.marketBalance.add(wrappedAvailable)
    : marketAccount.marketBalance
  const {
    isTestnet,
    isConnected,
    isSelectionMismatch,
    isWrongNetwork,
    touGateState,
    isAgreementFetching,
    refetchAgreementStatus,
  } = useNetworkGate({
    desiredChainId: market.chainId,
    agreementParty: "Lender",
  })

  const isDifferentChain = isSelectionMismatch || isWrongNetwork
  const touActionBlocked = touGateState !== "unblocked"
  const touRetryAvailable = touGateState === "unknown" && !isAgreementFetching

  const nowSec = useLivePeriodicNowSeconds(market)
  const periodicWindowClosed = isPeriodicWithdrawalWindowClosed(market, nowSec)
  const periodicTiming = getPeriodicWindowTiming(market, nowSec)
  const nextPeriodicWindowStart =
    periodicTiming && !periodicTiming.isTermClosed
      ? periodicTiming.nextWindowStart
      : undefined
  let withdrawTooltip = t("marketDetails.lender.transactions.withdraw.tooltip")

  if (market.periodicHooksConfig) {
    withdrawTooltip = t(
      "marketDetails.lender.transactions.withdraw.periodicTooltip",
    )
  }

  if (periodicWindowClosed) {
    const nextWindowStartText = nextPeriodicWindowStart
      ? t(
          "marketDetails.lender.transactions.withdraw.periodicWindow.nextStart",
          {
            date: formatPeriodicWithdrawalWindowStart(nextPeriodicWindowStart),
            countdown: humanizeDuration(
              Math.max(0, nextPeriodicWindowStart - nowSec) * 1000,
              { round: true, largest: 2 },
            ),
          },
        )
      : undefined

    withdrawTooltip = [
      t("marketDetails.lender.transactions.withdraw.periodicWindow.closed"),
      nextWindowStartText,
    ]
      .filter(Boolean)
      .join(" ")
  }

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.eq(0) ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    isTestnet &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.eq(0)
  const marketActionsManuallyDisabled = hasManuallyDisabledMarketActions(
    market.borrower,
  )

  const agreementGate = useDepositAgreementGate({
    marketAddress: market.address,
    chainId: market.chainId,
    generation: market.provenance?.generation,
  })
  const mlaRequiredAndUnsigned =
    agreementGate.state === "requires-mla-signature"
  const borrowerAgreementIncomplete =
    agreementGate.state === "requires-borrower-mla-selection"

  const handleClickToggleMLA = () => {
    setIsMLAOpen(!isMLAOpen)
  }

  const withdrawalActionState = resolveLenderWithdrawalActionState({
    accessState,
    hasMarketAccount: true,
    hasMarketBalance: combinedAvailable.gt(0),
    withdrawalAvailability: marketAccount.withdrawalAvailability,
    periodicWindowClosed,
  })
  const withdrawalUnavailableText =
    withdrawalActionState === "ready"
      ? undefined
      : t(WITHDRAWAL_UNAVAILABLE_KEY[withdrawalActionState])
  const actionState = resolveLenderActionState({
    isConnected,
    isDifferentChain,
    accessState,
    depositAvailable: !hideDeposit,
    touGateState,
    isAgreementFetching,
    depositAgreementState: agreementGate.state,
    withdrawalAvailable: withdrawalActionState === "ready",
    claimAvailable: !withdrawals.totalClaimableAmount.eq(0),
  })

  const handleClickDeposit = () => {
    if (touRetryAvailable) {
      toastError(t("marketDetails.lender.touGate.retryToast"))
      refetchAgreementStatus().catch(() => undefined)
      return
    }
    if (touActionBlocked) return

    if (agreementGate.state === "error") {
      toastError(t("marketDetails.lender.agreementGate.retryToast"))
      agreementGate.retry().catch(() => undefined)
      return
    }
    if (
      agreementGate.state === "loading" ||
      agreementGate.state === "requires-borrower-mla-selection" ||
      agreementGate.state === "requires-mla-signature"
    ) {
      return
    }
    if (agreementGate.state === "requires-non-mla-acknowledgement") {
      setIsMobileAcknowledgementOpen(true)
      return
    }

    setIsMobileDepositOpen(true)
  }

  let depositTooltip = t("marketDetails.lender.transactions.deposit.tooltip")
  if (touGateState === "blocked") {
    depositTooltip = t("marketDetails.lender.touGate.blockedTooltip")
  } else if (touGateState === "unknown") {
    depositTooltip = isAgreementFetching
      ? t("marketDetails.lender.touGate.checkingTooltip")
      : t("marketDetails.lender.touGate.retryTooltip")
  } else if (agreementGate.state === "error") {
    depositTooltip = t("marketDetails.lender.agreementGate.retryTooltip")
  } else if (borrowerAgreementIncomplete) {
    depositTooltip = t(
      "marketDetails.lender.agreementGate.borrowerIncompleteTooltip",
    )
  }

  let depositButtonText = t("marketDetails.lender.transactions.deposit.button")
  if (
    actionState.deposit === "checking-tou" ||
    actionState.deposit === "loading"
  ) {
    depositButtonText = t(
      "marketDetails.lender.transactions.deposit.buttonChecking",
    )
  } else if (
    actionState.deposit === "error" ||
    actionState.deposit === "retry-tou"
  ) {
    depositButtonText = t("common.buttons.retry")
  }

  let depositAction: React.ReactNode = (
    <Button
      onClick={handleClickDeposit}
      variant="contained"
      color="secondary"
      size="large"
      fullWidth
      disabled={
        actionState.deposit === "checking-tou" ||
        actionState.deposit === "tou-blocked" ||
        actionState.deposit === "loading" ||
        marketActionsManuallyDisabled ||
        marketAccount.maximumDeposit.eq(0)
      }
      sx={{ padding: "10px 20px", marginTop: "16px" }}
    >
      ↓ {depositButtonText}
    </Button>
  )
  if (showFaucet) {
    depositAction = <MobileFaucetButton marketAccount={marketAccount} />
  } else if (actionState.deposit === "unavailable") {
    depositAction = null
  } else if (borrowerAgreementIncomplete) {
    depositAction = (
      <MobileDepositStatus
        text={t("marketDetails.lender.agreementGate.waitingBorrower")}
      />
    )
  } else if (mlaRequiredAndUnsigned) {
    depositAction = (
      <>
        <MobileDepositStatus
          text={t("marketDetails.lender.agreementGate.waitingSignature")}
        />
        <Button
          onClick={handleClickToggleMLA}
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          sx={{ padding: "10px 20px", marginTop: "16px" }}
        >
          {t("marketDetails.lender.buttons.viewMla")}
        </Button>
      </>
    )
  }

  const showQueueWithdrawalBlock =
    actionState.surface === "actions" ||
    accessState === "resolving" ||
    accessState === "error" ||
    combinedAvailable.gt(0)
  const showActionContainer =
    actionState.surface === "switch-network" ||
    actionState.surface === "actions" ||
    showQueueWithdrawalBlock

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "sticky",
        bottom: "4px",
        width: "calc(100vw - 8px)",
      }}
    >
      {actionState.canClaim && (
        <Box
          sx={{
            display: "flex",
            padding: "12px",
            backgroundColor: COLORS.bunker,
            borderRadius: "14px",
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <MobileMarketTransactionItem
                title={t("marketDetails.lender.availableClaim")}
                amount={formatTokenWithCommas(withdrawals.totalClaimableAmount)}
                asset={market.underlyingToken.symbol}
              />
            </Box>

            <ClaimModal market={market} withdrawals={withdrawals} />
          </Box>
        </Box>
      )}

      {showActionContainer && (
        <Box
          sx={{
            display: "flex",
            flexDirection:
              actionState.surface === "switch-network" ? "column" : "row",
            gap: actionState.surface === "switch-network" ? 0 : "8px",
            padding: "12px",
            backgroundColor: COLORS.bunker,
            borderRadius: "14px",

            width: "100%",
          }}
        >
          {actionState.surface === "switch-network" && (
            <SwitchChainAlert desiredChainId={market.chainId} />
          )}

          {actionState.surface !== "switch-network" &&
            showQueueWithdrawalBlock && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <MobileMarketTransactionItem
                  title={t("marketDetails.lender.transactions.withdraw.title")}
                  tooltip={withdrawTooltip}
                  amount={formatTokenWithCommas(combinedAvailable)}
                  asset={market.underlyingToken.symbol}
                />

                {hasWrappedPosition && wrappedAvailable && (
                  <Box sx={{ marginTop: "4px" }}>
                    <Typography
                      variant="mobText3"
                      sx={{ color: COLORS.white06, display: "block" }}
                    >
                      {t(
                        "marketDetails.lender.transactions.withdraw.splitDirect",
                        {
                          amount: formatTokenWithCommas(
                            marketAccount.marketBalance,
                          ),
                        },
                      )}
                    </Typography>
                    <Typography
                      variant="mobText3"
                      sx={{ color: COLORS.white06, display: "block" }}
                    >
                      {t(
                        "marketDetails.lender.transactions.withdraw.splitWrapped",
                        { amount: formatTokenWithCommas(wrappedAvailable) },
                      )}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  onClick={() =>
                    setIsMobileWithdrawalOpen(!isMobileWithdrawalOpen)
                  }
                  disabled={!actionState.canWithdraw}
                  sx={{ padding: "10px 20px", marginTop: "16px" }}
                >
                  ↑{" "}
                  {withdrawalActionState === "fixed-term"
                    ? t(
                        "marketDetails.lender.transactions.withdraw.buttonLocked",
                      )
                    : t("marketDetails.lender.transactions.withdraw.button")}
                </Button>

                {withdrawalActionState !== "ready" && (
                  <Typography
                    variant="mobText3"
                    color={COLORS.white06}
                    marginTop="12px"
                  >
                    {withdrawalUnavailableText}
                  </Typography>
                )}
              </Box>
            )}

          {actionState.surface === "actions" && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <MobileMarketTransactionItem
                title={t("marketDetails.lender.transactions.deposit.title")}
                tooltip={depositTooltip}
                amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
                asset={market.underlyingToken.symbol}
              />

              {depositAction}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
