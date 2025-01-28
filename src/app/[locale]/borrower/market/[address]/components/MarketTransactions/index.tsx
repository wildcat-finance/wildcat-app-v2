import * as React from "react"

import { Box, Divider } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TransactionBlock } from "@/components/TransactionBlock"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer, MarketTxUpperButtonsContainer } from "./style"
import { AprModal } from "../Modals/AprModal"
import { BorrowModal } from "../Modals/BorrowModal"
import { CapacityModal } from "../Modals/CapacityModal"
import { RepayModal } from "../Modals/RepayModal"

export const MarketTransactions = ({
  market,
  marketAccount,
  holdTheMarket,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()

  const disableRepay = market.isClosed
  const disableBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())

  return (
    <>
      {holdTheMarket && (
        <Box sx={MarketTxUpperButtonsContainer}>
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("borrowerMarketDetails.buttons.kyc")} */}
          {/* </Button> */}
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("borrowerMarketDetails.buttons.mla")} */}
          {/* </Button> */}
          <CapacityModal marketAccount={marketAccount} />
          <AprModal marketAccount={marketAccount} />
        </Box>
      )}

      {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}

      <Box sx={MarketTxContainer}>
        <TransactionBlock
          title={t("borrowerMarketDetails.transactions.toRepay.title")}
          tooltip={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
          amount={formatTokenWithCommas(market.outstandingDebt)}
          asset={market.underlyingToken.symbol}
          warning={market.isIncurringPenalties || market.isDelinquent}
        >
          {!disableRepay && (
            <RepayModal
              marketAccount={marketAccount}
              disableRepayBtn={disableRepay}
            />
          )}
        </TransactionBlock>

        <TransactionBlock
          title={t("borrowerMarketDetails.transactions.toBorrow.title")}
          tooltip={t("borrowerMarketDetails.transactions.toBorrow.tooltip")}
          amount={formatTokenWithCommas(marketAccount.market.borrowableAssets)}
          asset={market.underlyingToken.symbol}
        >
          {!disableBorrow && (
            <BorrowModal
              market={market}
              marketAccount={marketAccount}
              disableBorrowBtn={disableBorrow}
            />
          )}
        </TransactionBlock>
      </Box>
    </>
  )
}
