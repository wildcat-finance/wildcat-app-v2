import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { HooksKind, MarketVersion } from "@wildcatfi/wildcat-sdk"
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
import { dayjs } from "@/utils/dayjs"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
} from "@/utils/formatters"
import { getPendingPeriodicAprChange } from "@/utils/periodicApr"

import { MarketTransactionsProps } from "./interface"
import { MarketTxContainer, MarketTxUpperButtonsContainer } from "./style"
import { useAdjustAPR } from "../../hooks/useAdjustApr"
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
    mutate: executePendingAprChange,
    isPending: isPendingAprExecution,
    isSuccess: isAprExecutionSuccess,
  } = useAdjustAPR(marketAccount, setPendingAprTxHash)
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
  const pendingAprExecutionPreview = pendingPeriodicAprChange
    ? marketAccount.previewSetAPR(pendingPeriodicAprChange.proposedAprBips)
    : undefined
  const pendingAprExecutionError =
    pendingAprExecutionPreview && pendingAprExecutionPreview.status !== "Ready"
      ? SDK_ERRORS_MAPPING.setApr[pendingAprExecutionPreview.status]
      : undefined
  // Settlement (repayAndProcessUnpaidWithdrawalBatches) can clear both of these
  // blockers; fetch a live quote to size and enable the settle action.
  const pendingAprBlockedBySettleable =
    !!pendingPeriodicAprChange?.isResponseWindowElapsed &&
    (pendingAprExecutionPreview?.status === "UnpaidWithdrawalsExist" ||
      pendingAprExecutionPreview?.status === "InsufficientReserves")
  const { data: pendingAprSettlementQuote } = usePeriodicAprSettlementQuote(
    marketAccount,
    pendingPeriodicAprChange?.proposedAprBips,
    pendingAprBlockedBySettleable,
  )
  const pendingAprNeedsSettlement =
    pendingAprBlockedBySettleable &&
    pendingAprSettlementQuote?.status === "NeedsSettlement"
  const currentAprFormatted = formatBps(
    market.annualInterestBips,
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
    pendingAprExecutionPreview?.status === "Ready"
  const pendingAprNoticeKey = (() => {
    if (!pendingPeriodicAprChange) return undefined
    if (!pendingPeriodicAprChange.isResponseWindowElapsed) {
      return "borrowerMarketDetails.parameters.pendingPeriodicApr.pendingNotice"
    }
    if (pendingAprNeedsSettlement) {
      if (pendingAprSettlementQuote?.needsRepayment) {
        return "borrowerMarketDetails.parameters.pendingPeriodicApr.settlementNotice"
      }
      return (pendingAprSettlementQuote?.remainingBatchesAfterThisPass ?? 0) > 0
        ? "borrowerMarketDetails.parameters.pendingPeriodicApr.settlementNoticeMultiPass"
        : "borrowerMarketDetails.parameters.pendingPeriodicApr.settlementNoticeZero"
    }
    if (pendingAprExecutionError) {
      return "borrowerMarketDetails.parameters.pendingPeriodicApr.blockedNotice"
    }
    return "borrowerMarketDetails.parameters.pendingPeriodicApr.readyNotice"
  })()
  const pendingAprNotice =
    pendingAprNoticeKey && pendingAprFormatted
      ? t(pendingAprNoticeKey, {
          currentApr: currentAprFormatted,
          proposedApr: pendingAprFormatted,
          readyAt: pendingAprReadyAt,
          reason:
            pendingAprExecutionError ?? pendingAprExecutionPreview?.status,
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
    (isAprExecutionSuccess || isAprSettlementSuccess) &&
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
    if (!pendingPeriodicAprChange) return

    executePendingAprChange({
      apr: pendingPeriodicAprChange.proposedAprBips / 100,
      mode: "set",
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

      {holdTheMarket &&
        pendingPeriodicAprChange &&
        pendingAprNotice &&
        dismissedAprNoticeKey !== aprNoticeDismissKey && (
          <PeriodicNoticeBanner
            tone="info"
            title={t(
              "borrowerMarketDetails.parameters.pendingPeriodicApr.bannerTitle",
              {
                currentApr: currentAprFormatted,
                proposedApr: pendingAprFormatted,
              },
            )}
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
                      return t(
                        "borrowerMarketDetails.parameters.pendingPeriodicApr.settling",
                      )
                    }
                    if (
                      (pendingAprSettlementQuote?.remainingBatchesAfterThisPass ??
                        0) > 0
                    ) {
                      return t(
                        "borrowerMarketDetails.parameters.pendingPeriodicApr.processBatchesProgress",
                        {
                          perPass: pendingAprSettlementQuote?.maxBatches,
                          total: pendingAprSettlementQuote?.unpaidBatchCount,
                        },
                      )
                    }
                    return pendingAprSettlementQuote?.needsRepayment
                      ? t(
                          "borrowerMarketDetails.parameters.pendingPeriodicApr.settleAndApply",
                        )
                      : t(
                          "borrowerMarketDetails.parameters.pendingPeriodicApr.processBatches",
                        )
                  })()}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  disabled={!canExecutePendingApr || isPendingAprExecution}
                  onClick={handleExecutePendingAprChange}
                >
                  {isPendingAprExecution
                    ? t(
                        "borrowerMarketDetails.parameters.pendingPeriodicApr.executing",
                      )
                    : t(
                        "borrowerMarketDetails.parameters.pendingPeriodicApr.execute",
                      )}
                </Button>
              ))
            }
          />
        )}

      {showAppliedAprNotice && (
        <PeriodicNoticeBanner
          tone="success"
          title={t(
            "borrowerMarketDetails.parameters.pendingPeriodicApr.appliedNoticeTitle",
          )}
          body={t(
            "borrowerMarketDetails.parameters.pendingPeriodicApr.appliedNotice",
            { currentApr: currentAprFormatted },
          )}
          onClose={() => setIsAppliedNoticeDismissed(true)}
          sx={{ mb: "24px" }}
        />
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
