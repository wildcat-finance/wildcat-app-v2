import * as React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import {
  DepositStatus,
  MarketAccount,
  QueueWithdrawalStatus,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { LenderMlaModal } from "@/app/[locale]/lender/components/LenderMlaModal"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { TransactionsContainer } from "@/app/[locale]/lender/market/[address]/components/MarketActions/styles"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import { TransactionBlock } from "@/components/TransactionBlock"
import { TargetChainId } from "@/config/network"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useAppDispatch } from "@/store/hooks"
import {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketActionsProps } from "./interface"
import { useFaucet } from "../../hooks/useFaucet"

const FaucetButton = ({ marketAccount }: { marketAccount: MarketAccount }) => {
  const {
    mutate: faucet,
    isPending: isFauceting,
    isSuccess,
  } = useFaucet(marketAccount)

  if (isSuccess) return null

  return (
    <Button
      disabled={isFauceting}
      variant="contained"
      size="large"
      sx={{ width: "152px" }}
      onClick={() => faucet()}
    >
      {isFauceting ? "Requesting Tokens..." : "Faucet"}
    </Button>
  )
}

export const MarketActions = ({
  marketAccount,
  withdrawals,
}: MarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market.address)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla, isLoading: signedMlaLoading } =
    useGetSignedMla(mlaResponse)
  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.raw.isZero() ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    TargetChainId === SupportedChainId.Sepolia &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.raw.isZero()

  const hideWithdraw =
    marketAccount.marketBalance.raw.isZero() ||
    marketAccount.withdrawalAvailability !== QueueWithdrawalStatus.Ready

  const ongoingWDs = (
    withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []
  ).flatMap((batch) => batch.requests.map(() => ({}))).length

  const isClaimableZero = withdrawals.totalClaimableAmount.raw.isZero()

  const isOngoingWDsZero = ongoingWDs === 0

  const dispatch = useAppDispatch()
  const handleChangeSection = () => {
    dispatch(setSection(LenderMarketSections.REQUESTS))
  }

  const getWithdrawalsStatus = () => {
    if (isOngoingWDsZero && isClaimableZero) {
      return t("lenderMarketDetails.transactions.claim.title.claim", {
        claim: "nothing",
      })
    }
    if (!isOngoingWDsZero && isClaimableZero) {
      return t("lenderMarketDetails.transactions.claim.title.ongoingWDs", {
        ongoingWDs,
      })
    }
    if (isOngoingWDsZero && !isClaimableZero) {
      return t("lenderMarketDetails.transactions.claim.title.claim", {
        claim: `${formatTokenWithCommas(withdrawals.totalClaimableAmount)} ${
          market.underlyingToken.symbol
        }`,
      })
    }
    if (!isOngoingWDsZero && !isClaimableZero) {
      return t(
        "lenderMarketDetails.transactions.claim.title.claimAndOngoingWDs",
        {
          ongoingWDs,
          claim: `${formatTokenWithCommas(withdrawals.totalClaimableAmount)} ${
            market.underlyingToken.symbol
          }`,
        },
      )
    }

    return ""
  }

  const smallestTokenAmountValue = market.underlyingToken.parseAmount(
    "0.00001".replace(/,/g, ""),
  )

  const isTooSmallMarketBalance: boolean =
    marketAccount.marketBalance.lt(smallestTokenAmountValue) &&
    !marketAccount.marketBalance.raw.isZero()

  return (
    <>
      <Box display="flex" columnGap="6px">
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() => handleAddToken()}
          disabled={isAddingToken && canAddToken}
        >
          {t("lenderMarketDetails.buttons.addToken")}
        </Button>

        <LenderMlaModal mla={mla} isLoading={mlaLoading} />
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box width="100%" display="flex" flexDirection="column">
        {(() => {
          if (mlaLoading || signedMlaLoading) {
            return <Typography variant="title3">Loading MLA Data...</Typography>
          }

          if (mlaRequiredAndUnsigned) {
            return (
              <>
                <Typography variant="title3" sx={{ marginBottom: "8px" }}>
                  Loan Agreement Signature Required
                </Typography>
                <Typography
                  variant="text3"
                  sx={{ marginBottom: isClaimableZero ? "0" : "24px" }}
                  color={COLORS.santasGrey}
                >
                  You need to sign the MLA before you can access this market.
                </Typography>
              </>
            )
          }

          return (
            <Box sx={TransactionsContainer}>
              <TransactionBlock
                title={t("lenderMarketDetails.transactions.deposit.title")}
                tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
                amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
                asset={market.underlyingToken.symbol}
              >
                {!showFaucet && <DepositModal marketAccount={marketAccount} />}
                {showFaucet && <FaucetButton marketAccount={marketAccount} />}
              </TransactionBlock>

              <TransactionBlock
                title={t("lenderMarketDetails.transactions.withdraw.title")}
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={
                  isTooSmallMarketBalance
                    ? `< 0.00001`
                    : formatTokenWithCommas(marketAccount.marketBalance)
                }
                asset={market.underlyingToken.symbol}
              >
                {!hideWithdraw && (
                  <WithdrawModal marketAccount={marketAccount} />
                )}
              </TransactionBlock>
            </Box>
          )
        })()}
      </Box>

      <Divider sx={{ margin: "32px 0 40px" }} />

      <Box width="100%" display="flex" flexDirection="column">
        <Typography variant="title3">{getWithdrawalsStatus()}</Typography>
        {isClaimableZero && (
          <Typography variant="text3" color={COLORS.santasGrey} marginTop="8px">
            {t("lenderMarketDetails.transactions.claim.subtitle")}
          </Typography>
        )}

        {(!isOngoingWDsZero || !isClaimableZero) && (
          <Box
            sx={{
              height: "27.95px",
              display: "flex",
              gap: "6px",
              marginTop: "24px",
            }}
          >
            {!isOngoingWDsZero && (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                sx={{ width: "fit-content" }}
                onClick={handleChangeSection}
              >
                {t(
                  "lenderMarketDetails.transactions.claim.buttons.withdrawals",
                )}
              </Button>
            )}

            {!isClaimableZero && (
              <ClaimModal market={market} withdrawals={withdrawals} />
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ margin: "40px 0 32px" }} />
    </>
  )
}
