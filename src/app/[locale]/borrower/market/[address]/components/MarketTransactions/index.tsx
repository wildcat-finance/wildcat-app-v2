import * as React from "react"

import { Box, Button } from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { BorrowModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/BorrowModal"
import { TransactionBlock } from "@/components/TransactionBlock"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer } from "./style"

export const MarketTransactions = ({
  market,
  marketAccount,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()

  const disableRepay = market.totalDebts.raw.isZero()
  const disableBorrow =
    market.totalDebts.raw.isZero() ||
    market?.isDelinquent ||
    market.isIncurringPenalties ||
    (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())

  const remainingInterest = market.totalBorrowed?.raw.isZero()
    ? "0"
    : humanizeDuration(market.secondsBeforeDelinquency * 1000, {
        round: true,
        units: ["d"],
      })

  return (
    <Box sx={MarketTxContainer}>
      <TransactionBlock
        title={t("borrowerMarketDetails.transactions.toRepay.title")}
        tooltip={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
        amount={formatTokenWithCommas(market.outstandingDebt)}
        asset={market.underlyingToken.symbol}
      >
        <Button
          variant="contained"
          size="large"
          sx={{ width: "152px" }}
          disabled={disableRepay}
        >
          {t("borrowerMarketDetails.buttons.repay")}
        </Button>
      </TransactionBlock>

      <TransactionBlock
        title={t("borrowerMarketDetails.transactions.toBorrow.title")}
        tooltip={t("borrowerMarketDetails.transactions.toBorrow.tooltip")}
        amount={formatTokenWithCommas(marketAccount.market.borrowableAssets)}
        asset={market.underlyingToken.symbol}
      >
        <BorrowModal
          available={formatTokenWithCommas(
            marketAccount.market.borrowableAssets,
            {
              withSymbol: true,
            },
          )}
          remaining={remainingInterest}
          disableOpenButton={disableBorrow}
        />
      </TransactionBlock>
    </Box>
  )
}
