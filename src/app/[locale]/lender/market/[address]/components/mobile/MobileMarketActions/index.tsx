import { Dispatch, SetStateAction } from "react"
import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import {
  DepositStatus,
  HooksKind,
  MarketAccount,
  QueueWithdrawalStatus,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { useFaucet } from "@/app/[locale]/lender/market/[address]/hooks/useFaucet"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import Clock from "@/assets/icons/clock_icon.svg"
import { toastError } from "@/components/Toasts"
import { TooltipButton } from "@/components/TooltipButton"
import { useDepositAgreementGate } from "@/hooks/useDepositAgreementGate"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useWrapperLimits } from "@/hooks/wrapper/useWrapperLimits"
import { COLORS } from "@/theme/colors"
import { hasManuallyDisabledMarketActions } from "@/utils/constants"
import { formatTokenWithCommas } from "@/utils/formatters"

export type MobileMarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
  isMobileWithdrawalOpen: boolean
  setIsMobileDepositOpen: Dispatch<SetStateAction<boolean>>
  setIsMobileAckOpen: Dispatch<SetStateAction<boolean>>
  setIsMobileWithdrawalOpen: Dispatch<SetStateAction<boolean>>
  isMLAOpen: boolean
  setIsMLAOpen: Dispatch<SetStateAction<boolean>>
  wrapper?: TokenWrapper
  hasWrapper?: boolean
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

export const MobileFaucetButton = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
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
      {isFauceting ? "Requesting Tokens..." : "Faucet"}
    </Button>
  )
}

export const MobileMarketActions = ({
  marketAccount,
  withdrawals,
  isMobileWithdrawalOpen,
  setIsMobileWithdrawalOpen,
  setIsMobileDepositOpen,
  setIsMobileAckOpen,
  isMLAOpen,
  setIsMLAOpen,
  wrapper,
  hasWrapper,
}: MobileMarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { address } = useAccount()
  const {
    isTestnet,
    isSelectionMismatch,
    isWrongNetwork,
    touGateState,
    isAgreementFetching,
    refetchAgreementStatus,
  } = useNetworkGate({
    desiredChainId: market.chainId,
  })

  // Authoritative wrapped ceiling — the same source the withdraw routing uses.
  const { data: wrapperLimits } = useWrapperLimits(
    market.chainId,
    wrapper,
    address,
  )
  const wrappedCap =
    hasWrapper && wrapper ? wrapperLimits?.maxWithdraw : undefined

  // Only count the wrapped position when it is actually withdrawable: dust
  // shares render as "0" and must not produce an "≈ 0 wrapped" breakdown.
  const hasWrappedPosition =
    !!wrappedCap &&
    wrappedCap.gte(market.underlyingToken.parseAmount("0.00001"))

  const wrappedAvailable = hasWrappedPosition ? wrappedCap : undefined

  /** Everything the lender can request, across both positions. */
  const combinedAvailable = wrappedAvailable
    ? marketAccount.marketBalance.add(wrappedAvailable)
    : marketAccount.marketBalance

  const isDifferentChain = isSelectionMismatch || isWrongNetwork
  const touActionBlocked = touGateState !== "unblocked"
  // The status fetch failed (not merely in flight): let the button through so
  // its click can retry the fetch instead of dead-ending on a disabled state.
  const touRetryAvailable = touGateState === "unknown" && !isAgreementFetching

  const notMature =
    market &&
    market.hooksConfig?.kind === HooksKind.FixedTerm &&
    market.hooksConfig?.fixedTermEndTime !== undefined &&
    market.hooksConfig.fixedTermEndTime * 1000 >= Date.now()

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.raw.isZero() ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    isTestnet &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.raw.isZero()
  const marketActionsManuallyDisabled = hasManuallyDisabledMarketActions(
    market.borrower,
  )

  const agreementGate = useDepositAgreementGate(market.address, market.chainId)
  const mlaRequiredAndUnsigned =
    agreementGate.state === "requires-mla-signature"
  const [depositOpenRequested, setDepositOpenRequested] = React.useState(false)

  const handleClickToggleMLA = () => {
    setIsMLAOpen(!isMLAOpen)
  }

  const disableWithdraw =
    combinedAvailable.raw.isZero() ||
    marketAccount.withdrawalAvailability !== QueueWithdrawalStatus.Ready

  const handleClickDeposit = () => {
    if (touRetryAvailable) {
      toastError("Couldn't verify Terms of Use status — retrying")
      refetchAgreementStatus().catch(() => undefined)
      return
    }
    if (touActionBlocked) return

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

    if (mlaRequiredAndUnsigned) return

    if (agreementGate.state === "satisfied") {
      setIsMobileDepositOpen(true)
      return
    }

    setIsMobileAckOpen(true)
  }

  React.useEffect(() => {
    if (touActionBlocked) {
      if (depositOpenRequested) setDepositOpenRequested(false)
      return
    }

    if (agreementGate.state === "error") {
      if (depositOpenRequested) setDepositOpenRequested(false)
      return
    }

    if (!depositOpenRequested || agreementGate.state === "loading") {
      return
    }

    setDepositOpenRequested(false)
    if (agreementGate.state === "requires-mla-signature") return

    if (agreementGate.state === "satisfied") {
      setIsMobileDepositOpen(true)
      return
    }

    setIsMobileAckOpen(true)
  }, [
    depositOpenRequested,
    agreementGate.state,
    setIsMobileDepositOpen,
    setIsMobileAckOpen,
    touActionBlocked,
  ])

  let depositTooltip = t("lenderMarketDetails.transactions.deposit.tooltip")
  if (touGateState === "blocked") {
    depositTooltip = "Accept the Terms of Use to deposit"
  } else if (touGateState === "unknown") {
    depositTooltip = isAgreementFetching
      ? "Checking Terms of Use status"
      : "Couldn't verify Terms of Use status — tap to retry"
  } else if (agreementGate.state === "error") {
    depositTooltip = "Tap to retry loading agreement data"
  }

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
      {!withdrawals.totalClaimableAmount.raw.isZero() && !isDifferentChain && (
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
                title="Available To Claim"
                amount={formatTokenWithCommas(withdrawals.totalClaimableAmount)}
                asset={market.underlyingToken.symbol}
              />
            </Box>

            <ClaimModal market={market} withdrawals={withdrawals} />
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: isDifferentChain ? "column" : "row",
          gap: isDifferentChain ? 0 : "8px",
          padding: "12px",
          backgroundColor: COLORS.bunker,
          borderRadius: "14px",

          width: "100%",
        }}
      >
        {isDifferentChain && (
          <SwitchChainAlert desiredChainId={market.chainId} />
        )}

        {!isDifferentChain && (
          <>
            {/* both columns stretch and pin their button to the bottom, so the
                two actions stay on one line however tall the text above is */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <MobileMarketTransactionItem
                // title={t("lenderMarketDetails.transactions.withdraw.title")}
                title="Available To Withdraw"
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={formatTokenWithCommas(combinedAvailable)}
                asset={market.underlyingToken.symbol}
              />

              {hasWrappedPosition && wrappedAvailable && (
                <Box sx={{ marginTop: "4px" }}>
                  {/* one per line: the combined string does not fit the column */}
                  <Typography
                    variant="mobText3"
                    sx={{ color: COLORS.white06, display: "block" }}
                  >
                    {t(
                      "lenderMarketDetails.transactions.withdraw.splitDirect",
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
                      "lenderMarketDetails.transactions.withdraw.splitWrapped",
                      { amount: formatTokenWithCommas(wrappedAvailable) },
                    )}
                  </Typography>
                </Box>
              )}

              <Box sx={{ width: "100%", marginTop: "auto" }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  onClick={() =>
                    setIsMobileWithdrawalOpen(!isMobileWithdrawalOpen)
                  }
                  disabled={notMature || disableWithdraw}
                  sx={{ padding: "10px 20px", marginTop: "16px" }}
                >
                  ↑{" "}
                  {notMature
                    ? t(
                        "lenderMarketDetails.transactions.withdraw.buttonLocked",
                      )
                    : t("lenderMarketDetails.transactions.withdraw.button")}
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              {mlaRequiredAndUnsigned ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    <Typography
                      variant="mobText3"
                      sx={{ color: COLORS.santasGrey }}
                    >
                      Master Loan Agreement
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
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
                    <Typography
                      variant="mobText3"
                      sx={{ lineHeight: "24px" }}
                      color={COLORS.white06}
                    >
                      Waiting for sign
                    </Typography>
                  </Box>

                  <Button
                    onClick={handleClickToggleMLA}
                    variant="contained"
                    color="secondary"
                    size="large"
                    fullWidth
                    sx={{ padding: "10px 20px", marginTop: "16px" }}
                  >
                    {t("lenderMarketDetails.buttons.viewMla")}
                  </Button>
                </>
              ) : (
                <>
                  <MobileMarketTransactionItem
                    title={t("lenderMarketDetails.transactions.deposit.title")}
                    tooltip={depositTooltip}
                    amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
                    asset={market.underlyingToken.symbol}
                  />

                  {/* shown only alongside the direct/wrapped breakdown opposite */}
                  {hasWrappedPosition && wrappedAvailable && (
                    <Typography
                      variant="mobText3"
                      sx={{ color: COLORS.white06, marginTop: "4px" }}
                    >
                      {t("lenderMarketDetails.transactions.deposit.subtitle")}
                    </Typography>
                  )}

                  <Box sx={{ width: "100%", marginTop: "auto" }}>
                    {showFaucet ? (
                      <MobileFaucetButton marketAccount={marketAccount} />
                    ) : (
                      <Button
                        onClick={handleClickDeposit}
                        variant="contained"
                        color="secondary"
                        size="large"
                        fullWidth
                        disabled={
                          (touActionBlocked && !touRetryAvailable) ||
                          marketActionsManuallyDisabled ||
                          marketAccount.maximumDeposit.raw.isZero()
                        }
                        sx={{ padding: "10px 20px", marginTop: "16px" }}
                      >
                        ↓ {t("lenderMarketDetails.transactions.deposit.button")}
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}
