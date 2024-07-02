import * as React from "react"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BorrowModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/BorrowModal"
import { RepayModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/RepayModal"
import { TransactionBlock } from "@/components/TransactionBlock"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer } from "./style"

export const MarketTransactions = ({
  market,
  marketAccount,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()

  const disableRepay = market.isClosed || market.totalDebts.raw.isZero()
  const disableBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    market.isIncurringPenalties ||
    (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())

  return (
    <Box sx={MarketTxContainer}>
      <TransactionBlock
        title={t("borrowerMarketDetails.transactions.toRepay.title")}
        tooltip={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
        amount={formatTokenWithCommas(market.outstandingDebt)}
        asset={market.underlyingToken.symbol}
      >
        <RepayModal
          marketAccount={marketAccount}
          disableRepayBtn={disableRepay}
        />
      </TransactionBlock>

      <TransactionBlock
        title={t("borrowerMarketDetails.transactions.toBorrow.title")}
        tooltip={t("borrowerMarketDetails.transactions.toBorrow.tooltip")}
        amount={formatTokenWithCommas(marketAccount.market.borrowableAssets)}
        asset={market.underlyingToken.symbol}
      >
        <BorrowModal
          market={market}
          marketAccount={marketAccount}
          disableBorrowBtn={disableBorrow}
        />
      </TransactionBlock>
    </Box>
  )
}
