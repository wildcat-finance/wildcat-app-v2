import { Dispatch, SetStateAction } from "react"
import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { DepositStatus, HooksKind, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { useFaucet } from "@/app/[locale]/lender/market/[address]/hooks/useFaucet"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import Clock from "@/assets/icons/clock_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export type MobileMarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
  isMobileDepositOpen: boolean
  isMobileWithdrawalOpen: boolean
  setIsMobileDepositOpen: Dispatch<SetStateAction<boolean>>
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
  isMobileDepositOpen,
  setIsMobileWithdrawalOpen,
  setIsMobileDepositOpen,
  isMLAOpen,
  setIsMLAOpen,
}: MobileMarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { isTestnet, isSelectionMismatch, isWrongNetwork } = useNetworkGate({
    desiredChainId: market.chainId,
    includeAgreementStatus: false,
  })

  const isDifferentChain = isSelectionMismatch || isWrongNetwork

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

  const { data: mla } = useMarketMla(market.address)
  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla } = useGetSignedMla(mlaResponse)
  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  const handleClickToggleMLA = () => {
    setIsMLAOpen(!isMLAOpen)
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
      {!mlaRequiredAndUnsigned &&
        !withdrawals.totalClaimableAmount.raw.isZero() &&
        !isDifferentChain && (
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
                  amount={formatTokenWithCommas(
                    withdrawals.totalClaimableAmount,
                  )}
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
          flexDirection:
            mlaRequiredAndUnsigned || isDifferentChain ? "column" : "row",
          gap: mlaRequiredAndUnsigned || isDifferentChain ? 0 : "8px",
          padding: "12px",
          backgroundColor: COLORS.bunker,
          borderRadius: "14px",

          width: "100%",
        }}
      >
        {isDifferentChain && (
          <SwitchChainAlert desiredChainId={market.chainId} />
        )}

        {mlaRequiredAndUnsigned && !isDifferentChain && (
          <>
            <Typography
              variant="mobH3"
              color={COLORS.white}
              textAlign="center"
              marginTop="12px"
            >
              Master Loan Agreement
            </Typography>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                gap: "4px",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <SvgIcon
                sx={{ fontSize: "12px", "& path": { fill: COLORS.white06 } }}
              >
                <Clock />
              </SvgIcon>
              <Typography variant="mobText3" color={COLORS.white06}>
                Waiting for sign
              </Typography>
            </Box>

            <Button
              onClick={handleClickToggleMLA}
              variant="contained"
              color="secondary"
              size="large"
              sx={{
                marginTop: "24px",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: "20px",
              }}
            >
              {t("lenderMarketDetails.buttons.viewMla")}
            </Button>
          </>
        )}

        {!mlaRequiredAndUnsigned && !isDifferentChain && (
          <>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <MobileMarketTransactionItem
                // title={t("lenderMarketDetails.transactions.withdraw.title")}
                title="Available To Withdraw"
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={formatTokenWithCommas(marketAccount.marketBalance)}
                asset={market.underlyingToken.symbol}
              />

              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={() =>
                  setIsMobileWithdrawalOpen(!isMobileWithdrawalOpen)
                }
                disabled={notMature}
                sx={{ padding: "10px 20px", marginTop: "16px" }}
              >
                ↑{" "}
                {notMature
                  ? t("lenderMarketDetails.transactions.withdraw.buttonLocked")
                  : t("lenderMarketDetails.transactions.withdraw.button")}
              </Button>
            </Box>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <MobileMarketTransactionItem
                title={t("lenderMarketDetails.transactions.deposit.title")}
                tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
                amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
                asset={market.underlyingToken.symbol}
              />

              {showFaucet ? (
                <MobileFaucetButton marketAccount={marketAccount} />
              ) : (
                <Button
                  onClick={() => setIsMobileDepositOpen(!isMobileDepositOpen)}
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  disabled={marketAccount.maximumDeposit.raw.isZero()}
                  sx={{ padding: "10px 20px", marginTop: "16px" }}
                >
                  ↓ {t("lenderMarketDetails.transactions.deposit.button")}
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}
