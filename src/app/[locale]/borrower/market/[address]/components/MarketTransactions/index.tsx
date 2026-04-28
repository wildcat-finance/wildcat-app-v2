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
import { dayjs } from "@/utils/dayjs"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
} from "@/utils/formatters"
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

  const tempRatiosDiffer =
    market.temporaryReserveRatio &&
    market.reserveRatioBips !== market.originalReserveRatioBips

  const nowSec = Date.now() / 1000
  const tempRatioExpired =
    tempRatiosDiffer && market.temporaryReserveRatioExpiry < nowSec

  const hasTempReserveRatio = tempRatiosDiffer && !tempRatioExpired

  const originalRatioFormatted = formatBps(
    market.originalReserveRatioBips,
    MARKET_PARAMS_DECIMALS.reserveRatioBips,
  )
  const currentRatioFormatted = formatBps(
    market.reserveRatioBips,
    MARKET_PARAMS_DECIMALS.reserveRatioBips,
  )
  const tempReserveRatioExpiry = hasTempReserveRatio
    ? dayjs
        .unix(market.temporaryReserveRatioExpiry)
        .utc()
        .format("D MMM YYYY, HH:mm [UTC]")
    : undefined

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

      {tempRatioExpired && (
        <Box
          sx={{
            display: "flex",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: COLORS.oasis,
            border: `1px solid ${COLORS.galliano}`,
            mb: "24px",
          }}
        >
          <Typography variant="text3" sx={{ color: COLORS.butteredRum }}>
            {t(
              "borrowerMarketDetails.parameters.tempReserveRatio.borrowerExpiredNotice",
              {
                currentRatio: currentRatioFormatted,
                originalRatio: originalRatioFormatted,
              },
            )}{" "}
            <Link
              href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
              target="_blank"
              style={{ color: COLORS.butteredRum, fontWeight: 600 }}
            >
              {t("borrowerMarketDetails.modals.apr.learnMore")}
            </Link>
          </Typography>
        </Box>
      )}

      {hasTempReserveRatio && (
        <Box
          sx={{
            display: "flex",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: COLORS.whiteSmoke,
            border: `1px solid ${COLORS.iron}`,
            mb: "24px",
          }}
        >
          <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
            {t(
              "borrowerMarketDetails.parameters.tempReserveRatio.borrowerActiveNotice",
              {
                currentRatio: currentRatioFormatted,
                originalRatio: originalRatioFormatted,
                expiry: tempReserveRatioExpiry,
              },
            )}{" "}
            <Link
              href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
              target="_blank"
              style={{ color: COLORS.blackRock, fontWeight: 600 }}
            >
              {t("borrowerMarketDetails.modals.apr.learnMore")}
            </Link>
          </Typography>
        </Box>
      )}

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
