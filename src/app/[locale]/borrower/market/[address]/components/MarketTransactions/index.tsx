import * as React from "react"

import { Box, Divider } from "@mui/material"
import { HooksKind, MarketVersion } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { MaturityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MaturityModal"
import { MinimumDepositModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MinimumDepositModal"
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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const handleClose = () => {
    setAnchorEl(null)
  }

  const disableRepay = market.isClosed
  const disableBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())

  const isFixedTerm =
    (market.version === MarketVersion.V1
      ? HooksKind.OpenTerm
      : market.hooksKind!) === HooksKind.FixedTerm

  const isAllowTermReduction =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.allowTermReduction && market.isInFixedTerm
      : undefined

  const allowSetMinDeposit =
    market.version === MarketVersion.V2 &&
    market.hooksConfig?.flags.useOnDeposit

  console.log(
    Number(
      formatTokenWithCommas(market.outstandingDebt, {
        fractionDigits: market.outstandingDebt.decimals,
      }),
    ),
  )

  const isTooSmallOutstandingDebt: boolean =
    Number(
      formatTokenWithCommas(market.outstandingDebt, {
        fractionDigits: market.outstandingDebt.decimals,
      }),
    ) < 0.00001 && !market.outstandingDebt.raw.isZero()

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
          {allowSetMinDeposit && (
            <MinimumDepositModal marketAccount={marketAccount} />
          )}
          {isFixedTerm && isAllowTermReduction && (
            <MaturityModal marketAccount={marketAccount} />
          )}
        </Box>
      )}

      {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}

      <Box sx={MarketTxContainer}>
        <TransactionBlock
          title={t("borrowerMarketDetails.transactions.toRepay.title")}
          tooltip={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
          amount={
            isTooSmallOutstandingDebt
              ? "< 0.00001"
              : formatTokenWithCommas(market.outstandingDebt)
          }
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
