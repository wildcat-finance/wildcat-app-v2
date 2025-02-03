import * as React from "react"

import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  SvgIcon,
  Typography,
} from "@mui/material"
import {
  FixedTermHooksConfig,
  HooksKind,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { MaturityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MaturityModal"
import { MinimumDepositModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MinimumDepositModal"
import DocsIcon from "@/assets/icons/docs_icon.svg"
import { TransactionBlock } from "@/components/TransactionBlock"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketTransactionsProps } from "./interface"
import {
  ElseButtonContainer,
  ElseButtonText,
  MarketTxContainer,
  MarketTxUpperButtonsContainer,
  MenuItemButton,
} from "./style"
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
      ? market.hooksConfig.allowTermReduction
      : undefined

  // const isAllowTermReduction = true

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
          <MinimumDepositModal marketAccount={marketAccount} />
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
