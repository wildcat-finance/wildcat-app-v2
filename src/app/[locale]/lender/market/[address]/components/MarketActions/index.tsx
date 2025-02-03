import * as React from "react"

import { Box, Button, Divider, Modal, Typography } from "@mui/material"
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

  const hideClaim = withdrawals.totalClaimableAmount.raw.isZero()

  const claimAmountString = hideClaim
    ? "nothing"
    : `${formatTokenWithCommas(withdrawals.totalClaimableAmount)} 
              ${market.underlyingToken.symbol}`

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
            return <Typography variant="text3">Loading...</Typography>
          }

          if (mlaRequiredAndUnsigned) {
            return (
              <>
                <Typography variant="title3" sx={{ marginBottom: "8px" }}>
                  Loan Agreement Signature Required
                </Typography>
                <Typography
                  variant="text3"
                  sx={{ marginBottom: hideClaim ? "0" : "24px" }}
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
                {!hideDeposit && <DepositModal marketAccount={marketAccount} />}
                {showFaucet && <FaucetButton marketAccount={marketAccount} />}
              </TransactionBlock>

              <TransactionBlock
                title={t("lenderMarketDetails.transactions.withdraw.title")}
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={formatTokenWithCommas(marketAccount.marketBalance)}
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
        <Typography variant="title3" sx={{ marginBottom: "8px" }}>
          {t("lenderMarketDetails.transactions.claim.title.beginning")}{" "}
          {claimAmountString}{" "}
          {t("lenderMarketDetails.transactions.claim.title.ending")}
        </Typography>
        {claimAmountString === "nothing" && (
          <Typography
            variant="text3"
            sx={{ marginBottom: hideClaim ? "0" : "24px" }}
            color={COLORS.santasGrey}
          >
            {t("lenderMarketDetails.transactions.claim.subtitle")}
          </Typography>
        )}
        {!hideClaim && <ClaimModal market={market} withdrawals={withdrawals} />}
      </Box>

      <Divider sx={{ margin: "40px 0 32px" }} />
    </>
  )
}
