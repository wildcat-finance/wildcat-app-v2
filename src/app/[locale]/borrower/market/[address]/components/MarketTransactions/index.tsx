import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MaturityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MaturityModal"
import { MinimumDepositModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MinimumDepositModal"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useAppDispatch } from "@/store/hooks"
import {
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"
import {
  getFixedTermHooksConfig,
  isFixedTermMarket,
  isHooksManagedMarket,
} from "@/utils/marketCapabilities"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer, MarketTxUpperButtonsContainer } from "./style"
import { AprModal } from "../Modals/AprModal"
import { BorrowModal } from "../Modals/BorrowModal"
import { CapacityModal } from "../Modals/CapacityModal"
import { RepayModal } from "../Modals/RepayModal"

export const MarketTransactions = ({
  market,
  marketAccount,
  withdrawals,
  holdTheMarket,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const disableRepay = market.isClosed
  const disableBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    (marketAccount && marketAccount.market.borrowableAssets.eq(0))

  const fixedTermHooksConfig = getFixedTermHooksConfig(market)
  const isFixedTerm = isFixedTermMarket(market)

  const isAllowTermReduction =
    fixedTermHooksConfig?.allowTermReduction && market.isInFixedTerm

  const allowSetMinDeposit =
    isHooksManagedMarket(market) &&
    (market.hooksConfig?.flags.useOnDeposit ?? false)

  const smallestTokenAmountValue = market.underlyingToken.parseAmount(
    "0.00001".replace(/,/g, ""),
  )

  const isTooSmallOutstandingDebt: boolean =
    market.outstandingDebt.lt(smallestTokenAmountValue) &&
    !market.outstandingDebt.eq(0)

  const ongoingWDs = withdrawals.activeWithdrawal?.requests.length ?? 0

  const isOngoingWDsZero = ongoingWDs === 0

  const handleClickWithdrawals = () => {
    dispatch(setCheckBlock(4))
    dispatch(
      setSidebarHighlightState({
        borrowRepay: false,
        statusDetails: false,
        marketSummary: false,
        withdrawals: true,
        lenders: false,
        mla: false,
        marketHistory: false,
      }),
    )
  }

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
          <Button
            component={Link}
            variant="outlined"
            color="secondary"
            size="small"
            href={EXTERNAL_LINKS.TELEGRAM_BOT}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              padding: "6px 12px 6px 6px !important",
              gap: "2px",
              border: `1px solid ${COLORS.hawkesBlue}`,
              color: COLORS.ultramarineBlue,
              textDecoration: "none",
              "&:hover": {
                bgcolor: "rgba(62,104,255,0.06)",
                border: `1px solid ${COLORS.hawkesBlue}`,
              },
            }}
          >
            <SvgIcon
              aria-hidden="true"
              sx={{
                fontSize: "20px",
                flexShrink: 0,
                "& path": { fill: COLORS.ultramarineBlue },
              }}
            >
              <TelegramIcon />
            </SvgIcon>

            {t("helpModal.items.telegram.botButton")}
          </Button>
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

      {!isOngoingWDsZero && (
        <>
          <Divider sx={{ margin: "32px 0 40px" }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <Typography variant="title3">
              {t("borrowerMarketDetails.transactions.ongoingWDs.title", {
                count: ongoingWDs,
              })}
            </Typography>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ width: "fit-content" }}
              onClick={handleClickWithdrawals}
            >
              {t("borrowerMarketDetails.transactions.ongoingWDs.button")}
            </Button>
          </Box>
        </>
      )}
    </>
  )
}
