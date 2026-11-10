import * as React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import { HooksKind, MarketVersion } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import {
  DefaultedMarketLink,
  MarketDefaultNotice,
} from "@/app/[locale]/borrower/market/[address]/components/MarketDefaultNotice"
import { MaturityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MaturityModal"
import { MinimumDepositModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MinimumDepositModal"
import { MarketMoreMenu } from "@/components/MarketMoreMenu"
import { MarketTelegramButton } from "@/components/MarketTelegramButton"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { useAppDispatch } from "@/store/hooks"
import {
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"
import { hasManuallyDisabledMarketActions } from "@/utils/constants"
import { dayjs } from "@/utils/dayjs"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
  trimAddress,
} from "@/utils/formatters"

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

  const { isDefaulted, defaultedMarketsOfBorrower } = useDefaultedMarkets(
    market.chainId,
  )
  const defaultStatus = isDefaulted(market.address)
  const isMarketDefaulted = defaultStatus === true
  const otherDefaultedAddresses = defaultedMarketsOfBorrower(
    market.borrower,
  ).filter((address) => address !== market.address.toLowerCase())

  const { data: borrowerMarkets } = useGetBorrowerMarkets(
    market.borrower as `0x${string}`,
    market.chainId,
  )
  const otherDefaultedMarkets: DefaultedMarketLink[] =
    otherDefaultedAddresses.map((address) => ({
      address,
      name:
        borrowerMarkets?.find(
          (borrowerMarket) => borrowerMarket.address.toLowerCase() === address,
        )?.name ?? trimAddress(address),
      chainId: market.chainId,
    }))

  const disableRepay = market.isClosed
  const hideBorrow =
    market.isClosed ||
    (!isMarketDefaulted &&
      (market?.isDelinquent ||
        (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())))
  const disableBorrow =
    hideBorrow ||
    defaultStatus !== false ||
    hasManuallyDisabledMarketActions(market.borrower)

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

  const smallestTokenAmountValue = market.underlyingToken.parseAmount(
    "0.00001".replace(/,/g, ""),
  )

  const isTooSmallOutstandingDebt: boolean =
    market.outstandingDebt.lt(smallestTokenAmountValue) &&
    !market.outstandingDebt.raw.isZero()

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
          <MarketTelegramButton />
          <MarketMoreMenu market={market} />
        </Box>
      )}

      {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}

      {isMarketDefaulted && <MarketDefaultNotice variant="ownMarket" />}

      {!isMarketDefaulted && otherDefaultedAddresses.length > 0 && (
        <MarketDefaultNotice
          variant="otherMarket"
          count={otherDefaultedAddresses.length}
          markets={otherDefaultedMarkets}
        />
      )}

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
          amount={
            isMarketDefaulted
              ? "0"
              : formatTokenWithCommas(marketAccount.market.borrowableAssets)
          }
          asset={market.underlyingToken.symbol}
        >
          {!hideBorrow && (
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
