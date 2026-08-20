import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { PeriodicAprSettlementStatus } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MaturityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MaturityModal"
import { MinimumDepositModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/MinimumDepositModal"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { PeriodicNoticeBanner } from "@/components/PeriodicNoticeBanner"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
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
} from "@/utils/formatters"
import { getMarketAprDisplayBips } from "@/utils/marketApr"
import {
  getFixedTermHooksConfig,
  isFixedTermMarket,
  isHooksManagedMarket,
} from "@/utils/marketCapabilities"
import { getPendingPeriodicAprChange } from "@/utils/periodicApr"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer, MarketTxUpperButtonsContainer } from "./style"
import {
  usePeriodicAprSettlementQuote,
  useSettleAndApplyPendingApr,
} from "../../hooks/useSettleAndApplyPendingApr"
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
  const [, setPendingAprTxHash] = React.useState<string | undefined>()
  const {
    mutate: settleAndApplyPendingApr,
    isPending: isPendingAprSettlement,
    isSuccess: isAprSettlementSuccess,
  } = useSettleAndApplyPendingApr(marketAccount, setPendingAprTxHash)
  // Session-scoped dismissals: the pending banner re-appears when its state
  // changes (key includes the notice kind) or on a fresh proposal.
  const [dismissedAprNoticeKey, setDismissedAprNoticeKey] = React.useState<
    string | null
  >(null)
  const [isAppliedNoticeDismissed, setIsAppliedNoticeDismissed] =
    React.useState(false)

  const disableRepay = market.isClosed
  const hideBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    (marketAccount && marketAccount.market.borrowableAssets.eq(0))
  const disableBorrow =
    hideBorrow || hasManuallyDisabledMarketActions(market.borrower)

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

  // Ticks while the periodic schedule is live so the pending-APR banner
  // (response-window elapsed, Execute enablement) flips without a refetch.
  const nowSec = useLivePeriodicNowSeconds(market)
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

  const pendingPeriodicAprChange = getPendingPeriodicAprChange(market, nowSec)
  const { data: pendingAprSettlementQuote } = usePeriodicAprSettlementQuote(
    marketAccount,
    pendingPeriodicAprChange?.proposedAprBips,
    !!pendingPeriodicAprChange?.isResponseWindowElapsed,
  )
  const pendingAprNeedsSettlement =
    pendingAprSettlementQuote?.status ===
    PeriodicAprSettlementStatus.NeedsSettlement
  const pendingAprExecutionErrorStatus =
    pendingAprSettlementQuote &&
    pendingAprSettlementQuote.status !== PeriodicAprSettlementStatus.Ready &&
    pendingAprSettlementQuote.status !==
      PeriodicAprSettlementStatus.NeedsSettlement
      ? pendingAprSettlementQuote.status
      : undefined
  const pendingAprExecutionError =
    pendingAprExecutionErrorStatus ===
    PeriodicAprSettlementStatus.ExecutionNotEnabled
      ? t("marketParameters.pendingPeriodicApr.executionNotEnabled")
      : pendingAprExecutionErrorStatus
  const aprDisplay = getMarketAprDisplayBips(market)
  const currentAprFormatted = formatBps(
    aprDisplay.configuredAprBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )
  const pendingAprFormatted = pendingPeriodicAprChange
    ? formatBps(
        pendingPeriodicAprChange.proposedAprBips,
        MARKET_PARAMS_DECIMALS.annualInterestBips,
      )
    : undefined
  const pendingAprReadyAt = pendingPeriodicAprChange
    ? dayjs
        .unix(pendingPeriodicAprChange.responseWindowEnd)
        .utc()
        .format("D MMM YYYY, HH:mm [UTC]")
    : undefined
  const canExecutePendingApr =
    !!pendingPeriodicAprChange?.isResponseWindowElapsed &&
    pendingAprSettlementQuote?.status === PeriodicAprSettlementStatus.Ready
  const pendingAprNoticeKey = (() => {
    if (!pendingPeriodicAprChange) return undefined
    if (!pendingPeriodicAprChange.isResponseWindowElapsed) {
      return "marketParameters.pendingPeriodicApr.pendingNotice"
    }
    if (pendingAprNeedsSettlement) {
      if (pendingAprSettlementQuote?.needsRepayment) {
        return "marketParameters.pendingPeriodicApr.settlementNotice"
      }
      return (pendingAprSettlementQuote?.remainingBatchesAfterThisPass ?? 0) > 0
        ? "marketParameters.pendingPeriodicApr.settlementNoticeMultiPass"
        : "marketParameters.pendingPeriodicApr.settlementNoticeZero"
    }
    if (pendingAprExecutionError) {
      return "marketParameters.pendingPeriodicApr.blockedNotice"
    }
    return "marketParameters.pendingPeriodicApr.readyNotice"
  })()
  const pendingAprNotice =
    pendingAprNoticeKey && pendingAprFormatted
      ? t(pendingAprNoticeKey, {
          currentApr: currentAprFormatted,
          proposedApr: pendingAprFormatted,
          readyAt: pendingAprReadyAt,
          reason: pendingAprExecutionError,
          amount: pendingAprSettlementQuote
            ? formatTokenWithCommas(pendingAprSettlementQuote.amountToSettle)
            : undefined,
          symbol: market.underlyingToken.symbol,
          totalBatches: pendingAprSettlementQuote?.unpaidBatchCount,
          perPass: pendingAprSettlementQuote?.maxBatches,
        })
      : undefined
  const aprNoticeDismissKey =
    pendingPeriodicAprChange && pendingAprNoticeKey
      ? `${pendingPeriodicAprChange.proposalTimestamp}:${pendingAprNoticeKey}`
      : null
  // After applying (directly or via settlement) the proposal disappears from
  // `getPendingPeriodicAprChange`; confirm the outcome instead of leaving a
  // gap where the banner silently vanished.
  const showAppliedAprNotice =
    holdTheMarket &&
    !pendingPeriodicAprChange &&
    isAprSettlementSuccess &&
    !isAppliedNoticeDismissed

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

  const handleExecutePendingAprChange = () => {
    if (!pendingPeriodicAprChange || !pendingAprSettlementQuote) return

    settleAndApplyPendingApr({
      proposedAprBips: pendingPeriodicAprChange.proposedAprBips,
      quote: pendingAprSettlementQuote,
    })
  }

  const handleSettleAndApplyPendingApr = () => {
    if (!pendingPeriodicAprChange || !pendingAprSettlementQuote) return

    settleAndApplyPendingApr({
      proposedAprBips: pendingPeriodicAprChange.proposedAprBips,
      quote: pendingAprSettlementQuote,
    })
  }

  return (
    <>
      {holdTheMarket && (
        <Box sx={MarketTxUpperButtonsContainer}>
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("marketDetails.borrower.buttons.kyc")} */}
          {/* </Button> */}
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("marketDetails.borrower.buttons.mla")} */}
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

            {t("modals.shared.help.telegram.botButton")}
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
            {t("marketParameters.tempReserveRatio.borrowerExpiredNotice", {
              currentRatio: currentRatioFormatted,
              originalRatio: originalRatioFormatted,
            })}{" "}
            <Link
              href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
              target="_blank"
              style={{ color: COLORS.butteredRum, fontWeight: 600 }}
            >
              {t("common.buttons.learnMore")}
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
            {t("marketParameters.tempReserveRatio.borrowerActiveNotice", {
              currentRatio: currentRatioFormatted,
              originalRatio: originalRatioFormatted,
              expiry: tempReserveRatioExpiry,
            })}{" "}
            <Link
              href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
              target="_blank"
              style={{ color: COLORS.blackRock, fontWeight: 600 }}
            >
              {t("common.buttons.learnMore")}
            </Link>
          </Typography>
        </Box>
      )}

      {holdTheMarket &&
        pendingPeriodicAprChange &&
        pendingAprNotice &&
        dismissedAprNoticeKey !== aprNoticeDismissKey && (
          <PeriodicNoticeBanner
            tone="info"
            title={t("marketParameters.pendingPeriodicApr.bannerTitle", {
              currentApr: currentAprFormatted,
              proposedApr: pendingAprFormatted,
            })}
            body={pendingAprNotice}
            onClose={() => setDismissedAprNoticeKey(aprNoticeDismissKey)}
            sx={{ mb: "24px" }}
            action={
              pendingPeriodicAprChange.isResponseWindowElapsed &&
              (pendingAprNeedsSettlement ? (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  disabled={isPendingAprSettlement}
                  onClick={handleSettleAndApplyPendingApr}
                >
                  {(() => {
                    if (isPendingAprSettlement) {
                      return t("marketParameters.pendingPeriodicApr.settling")
                    }
                    if (
                      (pendingAprSettlementQuote?.remainingBatchesAfterThisPass ??
                        0) > 0
                    ) {
                      return t(
                        "marketParameters.pendingPeriodicApr.processBatchesProgress",
                        {
                          perPass: pendingAprSettlementQuote?.maxBatches,
                          total: pendingAprSettlementQuote?.unpaidBatchCount,
                        },
                      )
                    }
                    return pendingAprSettlementQuote?.needsRepayment
                      ? t("marketParameters.pendingPeriodicApr.settleAndApply")
                      : t("marketParameters.pendingPeriodicApr.processBatches")
                  })()}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  disabled={!canExecutePendingApr || isPendingAprSettlement}
                  onClick={handleExecutePendingAprChange}
                >
                  {isPendingAprSettlement
                    ? t("marketParameters.pendingPeriodicApr.executing")
                    : t("marketParameters.pendingPeriodicApr.execute")}
                </Button>
              ))
            }
          />
        )}

      {showAppliedAprNotice && (
        <PeriodicNoticeBanner
          tone="success"
          title={t("marketParameters.pendingPeriodicApr.appliedNoticeTitle")}
          body={t("marketParameters.pendingPeriodicApr.appliedNotice", {
            currentApr: currentAprFormatted,
          })}
          onClose={() => setIsAppliedNoticeDismissed(true)}
          sx={{ mb: "24px" }}
        />
      )}

      <Box sx={MarketTxContainer}>
        <TransactionBlock
          title={t("marketDetails.borrower.transactions.toRepay.title")}
          tooltip={t("marketDetails.borrower.transactions.toRepay.tooltip")}
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
          title={t("common.fields.availableToBorrow")}
          tooltip={t("marketDetails.borrower.transactions.toBorrow.tooltip")}
          amount={formatTokenWithCommas(marketAccount.market.borrowableAssets)}
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
              {t("marketDetails.borrower.transactions.ongoingWDs.title", {
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
              {t("common.buttons.goToWithdrawals")}
            </Button>
          </Box>
        </>
      )}
    </>
  )
}
