import * as React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { StatementModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/StatementModal"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { TransactionBlock } from "@/components/TransactionBlock"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export type MarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
}

export const MarketActions = ({
  marketAccount,
  withdrawals,
}: MarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const [isStatementOpen, setIsStatementOpen] = React.useState(false)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const handleOpenStatement = () => {
    setIsStatementOpen(true)
  }

  const hideDeposit =
    market.isClosed || marketAccount.maximumDeposit.raw.isZero()

  const hideWithdraw =
    market.isClosed || marketAccount.marketBalance.raw.isZero()

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

        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={handleOpenStatement}
        >
          {t("lenderMarketDetails.buttons.statement")}
        </Button>

        <StatementModal
          isOpen={isStatementOpen}
          setIsOpen={setIsStatementOpen}
        />
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box
        sx={{
          width: "100%",
          maxWidth: "807px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <TransactionBlock
          title={t("lenderMarketDetails.transactions.deposit.title")}
          tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
          amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
          asset={market.underlyingToken.symbol}
        >
          {!hideDeposit && <DepositModal marketAccount={marketAccount} />}
        </TransactionBlock>

        <TransactionBlock
          title={t("lenderMarketDetails.transactions.withdraw.title")}
          tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
          amount={formatTokenWithCommas(marketAccount.marketBalance)}
          asset={market.underlyingToken.symbol}
        >
          {!hideWithdraw && <WithdrawModal marketAccount={marketAccount} />}
        </TransactionBlock>
      </Box>

      <Divider sx={{ margin: "32px 0 40px" }} />

      {!market.isClosed && (
        <>
          <Box width="100%" display="flex" flexDirection="column">
            <Typography variant="title3" sx={{ marginBottom: "8px" }}>
              {t("lenderMarketDetails.transactions.claim.title.beginning")}{" "}
              {claimAmountString}{" "}
              {t("lenderMarketDetails.transactions.claim.title.ending")}
            </Typography>
            <Typography
              variant="text3"
              sx={{ marginBottom: hideClaim ? "0" : "24px" }}
              color={COLORS.santasGrey}
            >
              {t("lenderMarketDetails.transactions.claim.subtitle")}
            </Typography>

            {!hideClaim && (
              <ClaimModal market={market} withdrawals={withdrawals} />
            )}
          </Box>

          <Divider sx={{ margin: "40px 0 32px" }} />
        </>
      )}
    </>
  )
}
