import { useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import {
  HooksKind,
  QueueWithdrawalStatus,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useWithdrawalBatchJoinWarning } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawalBatchJoinWarning"
import {
  LegStatus,
  useWithdrawFlow,
  WithdrawLegKind,
} from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawFlow"
import { useWithdrawRouting } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawRouting"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { PeriodicWithdrawalWindowNotice } from "@/components/PeriodicWithdrawalWindowNotice"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { TxStatusPanel, TxStatusSheet } from "@/components/TxStatusPanel"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"
import { isPeriodicWithdrawalWindowClosed } from "@/utils/periodicWithdrawalWindow"
import { getStepProgress } from "@/utils/stepProgress"

import { WithdrawForm } from "./components/WithdrawForm"
import { StepRow, WithdrawSteps } from "./components/WithdrawSteps"
import { WithdrawModalProps } from "./interface"

/** Fixed dialog height: every view is laid out inside the same box. */
const DIALOG_HEIGHT = "493px"

const SINGLE_TRANSACTION_STEPS = 3

export const WithdrawModal = ({
  marketAccount,
  wrapper,
  hasWrapper,
  isMobileOpen,
  setIsMobileOpen,
}: WithdrawModalProps) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { market } = marketAccount
  const { symbol } = market.underlyingToken

  const [isDesktopOpen, setIsDesktopOpen] = useState(false)
  const [snapshotShares, setSnapshotShares] = useState<TokenAmount>()
  const isOpen = isMobile ? !!isMobileOpen : isDesktopOpen
  const isOpenRef = React.useRef(isOpen)
  isOpenRef.current = isOpen

  // /**
  //  * The form is the tallest view. Remember its height and hold it for the rest
  //  * of the flow so the dialog does not resize from step to step. Kept as a
  //  * minimum (never a fixed height) so unusually long content can still grow.
  //  */
  // const paperRef = useRef<HTMLDivElement>(null)
  // const [lockedHeight, setLockedHeight] = useState<number>()

  const routing = useWithdrawRouting({ marketAccount, wrapper, hasWrapper })
  const flow = useWithdrawFlow({ marketAccount, wrapper })
  const routeRef = React.useRef(routing.route)
  routeRef.current = routing.route

  const notMature =
    market.hooksConfig?.kind === HooksKind.FixedTerm &&
    market.hooksConfig?.fixedTermEndTime !== undefined &&
    market.hooksConfig.fixedTermEndTime * 1000 >= Date.now()
  const nowSec = useLivePeriodicNowSeconds(market)
  const periodicWindowClosed = isPeriodicWithdrawalWindowClosed(market, nowSec)

  const availability = marketAccount.withdrawalAvailability
  let blockingError: string | undefined
  if (periodicWindowClosed) {
    blockingError = t(
      "marketDetails.lender.transactions.withdraw.periodicWindow.closed",
    )
  } else if (availability !== QueueWithdrawalStatus.Ready) {
    blockingError = SDK_ERRORS_MAPPING.queueWithdrawal[availability]
  }

  const batchJoinWarning = useWithdrawalBatchJoinWarning({
    marketAccount,
    requestAmount: routing.route.amount,
    dustFloor: routing.dustFloor,
    requestIsValid: routing.isValid && !blockingError,
    useExactScaledBalance:
      routing.route.isFullMax && !routing.route.usesWrapped,
    enabled: isOpen,
  })

  /** Transaction count for the current route, before the flow is started. */
  const previewLegCount = React.useMemo(() => {
    if (!routing.route.usesWrapped) return 1
    return flow.isBatched ? 1 : 2
  }, [routing.route.usesWrapped, flow.isBatched])

  // ---- view selection ----
  /** A one-transaction flow gets no steps screen: sign straight from the form. */
  const isSingleLeg = flow.legs.length === 1

  const view = (() => {
    if (!flow.snapshot) return "form" as const
    if (flow.proposed) return "proposed" as const
    if (flow.isComplete) return "done" as const
    if (isSingleLeg)
      return flow.failed ? ("error" as const) : ("loading" as const)
    return "steps" as const
  })()

  const progress = React.useMemo(() => {
    if (view === "form") return getStepProgress(0, SINGLE_TRANSACTION_STEPS)

    const legCount = flow.legs.length || previewLegCount || 1
    const steps = legCount + 2
    const step =
      view === "done" || view === "proposed" ? steps - 1 : flow.currentLeg + 1

    return getStepProgress(step, steps)
  }, [flow.legs.length, flow.currentLeg, previewLegCount, view])

  const handleClose = () => {
    isOpenRef.current = false
    flow.reset()
    routing.reset()
    setSnapshotShares(undefined)
    if (isMobile) {
      setIsMobileOpen?.(false)
    } else {
      setIsDesktopOpen(false)
    }
  }

  const handleOpen = () => {
    flow.reset()
    routing.reset()
    setSnapshotShares(undefined)
    setIsDesktopOpen(true)
  }

  // Reset when the mobile sheet is (re)opened from the page.
  useEffect(() => {
    if (isMobileOpen) {
      flow.reset()
      routing.reset()
      setSnapshotShares(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileOpen])

  /**
   * Back to the amount form. Only offered before the first signature — once a
   * leg is on-chain there is nothing to rewind to.
   */
  const canGoBackToForm =
    view === "steps" && flow.currentLeg === 0 && !flow.busy

  const handleBackToForm = () => {
    flow.reset()
    setSnapshotShares(undefined)
  }

  const handleConfirm = async () => {
    if (batchJoinWarning.isChecking) return
    const { route } = routing
    if (batchJoinWarning.state === "clear") {
      const latestState = await batchJoinWarning.refresh()
      if (
        latestState !== "clear" ||
        !isOpenRef.current ||
        routeRef.current !== route
      ) {
        return
      }
    }

    setSnapshotShares(routing.sharesToUnwrap)
    flow.begin(route)
  }

  // ---- step rows ----
  const stepRows: StepRow[] = React.useMemo(() => {
    const { snapshot } = flow
    if (!snapshot) return []

    const statusLabel = (status: LegStatus) => {
      switch (status) {
        case LegStatus.Done:
          return t(
            "marketDetails.lender.transactions.withdraw.steps.statusDone",
          )
        case LegStatus.Failed:
          return t(
            "marketDetails.lender.transactions.withdraw.steps.statusFailed",
          )
        case LegStatus.Busy:
          return t(
            "marketDetails.lender.transactions.withdraw.steps.statusConfirming",
          )
        case LegStatus.Waiting:
          return t(
            "marketDetails.lender.transactions.withdraw.steps.statusWaiting",
          )
        default:
          return t("common.buttons.next")
      }
    }

    const sharesAmount = snapshotShares ?? routing.sharesToUnwrap
    const shareSymbol = wrapper?.shareToken.symbol ?? ""
    const totalLabel = formatTokenWithCommas(snapshot.amount)

    return flow.legs.map((leg, index) => {
      const status = flow.legStatus(index)

      if (leg.kind === WithdrawLegKind.Unwrap) {
        return {
          n: leg.n,
          title: t(
            "marketDetails.lender.transactions.withdraw.steps.unwrapTitle",
          ),
          detail: sharesAmount
            ? t(
                "marketDetails.lender.transactions.withdraw.steps.unwrapDetail",
                {
                  shares: formatTokenWithCommas(sharesAmount),
                  shareSymbol,
                  amount: formatTokenWithCommas(snapshot.fromWrapped),
                  symbol,
                },
              )
            : t(
                "marketDetails.lender.transactions.withdraw.steps.unwrapDetailNoShares",
                {
                  amount: formatTokenWithCommas(snapshot.fromWrapped),
                  symbol,
                },
              ),
          status,
          statusLabel: statusLabel(status),
        }
      }

      if (leg.kind === WithdrawLegKind.Batched) {
        return {
          n: leg.n,
          title: t(
            "marketDetails.lender.transactions.withdraw.steps.batchedTitle",
          ),
          detail: t(
            "marketDetails.lender.transactions.withdraw.steps.batchedDetail",
            {
              shares: sharesAmount ? formatTokenWithCommas(sharesAmount) : "",
              shareSymbol,
              amount: totalLabel,
              symbol,
            },
          ),
          status,
          statusLabel: statusLabel(status),
        }
      }

      return {
        n: leg.n,
        title: t("marketDetails.lender.transactions.withdraw.steps.queueTitle"),
        detail: snapshot.usesWrapped
          ? t("marketDetails.lender.transactions.withdraw.steps.queueDetail", {
              amount: totalLabel,
              symbol,
            })
          : t(
              "marketDetails.lender.transactions.withdraw.steps.queueDetailDirect",
              { amount: totalLabel, symbol },
            ),
        status,
        statusLabel: statusLabel(status),
      }
    })
  }, [flow, snapshotShares, routing.sharesToUnwrap, wrapper, symbol, t])

  // ---- footer labels ----
  const confirmLabel = (() => {
    if (routing.overMax)
      return t("marketDetails.lender.transactions.withdraw.confirm.exceeds")
    if (!routing.isValid || blockingError)
      return t("marketDetails.lender.transactions.withdraw.confirm.enterAmount")
    if (batchJoinWarning.isChecking)
      return t(
        "marketDetails.lender.transactions.withdraw.confirm.checkingBatch",
      )
    if (
      batchJoinWarning.state === "warning" ||
      batchJoinWarning.state === "unknown"
    ) {
      return t(
        "marketDetails.lender.transactions.withdraw.confirm.withdrawAnyway",
        { count: previewLegCount },
      )
    }
    return t("marketDetails.lender.transactions.withdraw.confirm.withdraw", {
      amount: formatTokenWithCommas(routing.route.amount),
      symbol,
      count: previewLegCount,
    })
  })()

  const signLabel = (() => {
    if (flow.busy)
      return t("marketDetails.lender.transactions.withdraw.steps.signBusy")
    const leg = stepRows[flow.currentLeg]
    if (flow.failed && leg) {
      return t("marketDetails.lender.transactions.withdraw.steps.retry", {
        title: leg.title,
      })
    }
    if (flow.legs.length <= 1)
      return t("marketDetails.lender.transactions.withdraw.steps.signOne")
    return t("marketDetails.lender.transactions.withdraw.steps.signMany", {
      current: flow.currentLeg + 1,
      total: flow.legs.length,
      title: leg?.title ?? "",
    })
  })()

  // ---- bodies ----
  const formBody = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <PeriodicWithdrawalWindowNotice market={market} />
      <WithdrawForm
        routing={routing}
        marketAccount={marketAccount}
        wrapper={wrapper}
        legCount={previewLegCount}
        isBatched={flow.isBatched}
        isMultisig={flow.isMultisig}
        safeThreshold={flow.safeThreshold}
        blockingError={blockingError}
        batchJoinWarning={batchJoinWarning}
      />
    </Box>
  )

  const failureSubtitle = t(
    "marketDetails.lender.transactions.withdraw.failed.subtitle",
  )

  const stepsBody = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <WithdrawSteps
        headerLabel={t(
          "marketDetails.lender.transactions.withdraw.steps.header",
        )}
        amountLabel={`${formatTokenWithCommas(
          flow.snapshot?.amount ?? routing.route.amount,
        )} ${symbol}`}
        rows={stepRows}
      />
      {flow.failed && !!flow.error && (
        <Box
          role="alert"
          sx={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "10px",
            backgroundColor: COLORS.remy,
            border: `1px solid ${COLORS.dullRed08}`,
            color: COLORS.dullRed,
          }}
        >
          <Typography
            variant="text3"
            sx={{ display: "block", fontWeight: 600, lineHeight: "20px" }}
          >
            {t("common.states.error")}
          </Typography>
          <Typography
            variant="text3"
            sx={{ display: "block", marginTop: "4px", lineHeight: "20px" }}
          >
            {failureSubtitle}
          </Typography>
        </Box>
      )}
    </Box>
  )

  const terminalClose = isMobile ? handleClose : undefined

  const doneBody = (
    <TxStatusPanel
      status="success"
      onClose={terminalClose}
      txHash={flow.result?.txHash}
      title={t("marketDetails.lender.transactions.withdraw.success.title")}
      subtitle={t(
        "marketDetails.lender.transactions.withdraw.success.subtitle",
        {
          amount: flow.result
            ? formatTokenWithCommas(flow.result.queuedAmount)
            : formatTokenWithCommas(
                flow.snapshot?.amount ?? routing.route.amount,
              ),
          symbol,
        },
      )}
    />
  )

  const proposedBody = (
    <TxStatusPanel
      status="success"
      onClose={terminalClose}
      txHash={flow.txHash}
      title={t("marketDetails.lender.transactions.withdraw.proposed.title")}
      subtitle={t(
        "marketDetails.lender.transactions.withdraw.proposed.subtitle",
        { count: flow.safeThreshold },
      )}
    />
  )

  const loadingBody = (
    <TxStatusPanel
      status="loading"
      txHash={flow.txHash}
      subtitle={stepRows[0]?.title}
    />
  )

  const errorBody = (
    <TxStatusPanel
      status="error"
      onAction={() => {
        flow.signCurrent()
      }}
      onClose={handleClose}
      txHash={flow.txHash}
      subtitle={failureSubtitle}
    />
  )

  const renderBody = (v: typeof view) => {
    if (v === "form") return formBody
    if (v === "steps") return stepsBody
    if (v === "loading") return loadingBody
    if (v === "error") return errorBody
    if (v === "done") return doneBody
    return proposedBody
  }

  const renderFooter = (v: typeof view) => {
    if (v === "form") {
      return (
        <TxModalFooter
          mainBtnText={confirmLabel}
          mainBtnOnClick={handleConfirm}
          disableMainBtn={
            !routing.isValid || !!blockingError || batchJoinWarning.isChecking
          }
        />
      )
    }
    if (v === "loading" || v === "error") return null
    if (v === "steps") {
      return (
        <TxModalFooter
          mainBtnText={signLabel}
          mainBtnOnClick={() => {
            flow.signCurrent()
          }}
          disableMainBtn={flow.busy}
        />
      )
    }
    return (
      <TxModalFooter
        mainBtnText={t(
          "marketDetails.lender.transactions.withdraw.success.back",
        )}
        mainBtnOnClick={handleClose}
      />
    )
  }

  const isTerminalView =
    view === "loading" ||
    view === "error" ||
    view === "done" ||
    view === "proposed"

  const dialogHeight =
    batchJoinWarning.state === "clear"
      ? DIALOG_HEIGHT
      : "min(647px, calc(100dvh - 32px))"

  // ---- mobile ----
  if (isMobile && isMobileOpen) {
    // eslint-disable-next-line no-nested-ternary
    const baseView = !isTerminalView ? view : isSingleLeg ? "form" : "steps"

    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "14px",
            paddingBottom: "12px",
          }}
        >
          <TransactionHeader
            label={t("marketDetails.lender.modals.withdraw.title")}
            arrowOnClick={
              // eslint-disable-next-line no-nested-ternary
              baseView === "form"
                ? handleClose
                : canGoBackToForm
                  ? handleBackToForm
                  : null
            }
            crossOnClick={handleClose}
            progress={progress}
          />

          <Box
            sx={{
              padding: "24px 20px 16px",
              width: "100%",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderBody(baseView)}
          </Box>

          {renderFooter(baseView)}
        </Box>

        <TxStatusSheet open={isTerminalView}>{renderBody(view)}</TxStatusSheet>
      </>
    )
  }

  // ---- desktop ----
  return (
    <>
      <Button
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        onClick={handleOpen}
        disabled={notMature}
      >
        {notMature
          ? t("marketDetails.lender.transactions.withdraw.buttonLocked")
          : t("marketDetails.lender.transactions.withdraw.button")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={flow.busy ? undefined : handleClose}
        sx={{
          "& .MuiDialog-paper": {
            height: dialogHeight,
            minHeight: dialogHeight,
            maxHeight: dialogHeight,
            width: "440px",
            minWidth: "440px !important",
            maxWidth: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {(view === "form" || view === "steps") && (
          <TxModalHeader
            title={t("marketDetails.lender.modals.withdraw.title")}
            arrowOnClick={canGoBackToForm ? handleBackToForm : null}
            crossOnClick={flow.busy ? null : handleClose}
          />
        )}

        {/* flex:1 makes the body absorb the paper's spare height so the footer
            is pinned to the bottom instead of leaving dead space under it */}
        <Box
          width="100%"
          padding={`0 ${isTerminalView ? "0" : "24px"} ${
            view === "loading" || view === "error" ? "0" : "16px"
          }`}
          marginTop={isTerminalView ? 0 : "16px"}
          sx={{
            flex: 1,
            // fixed-height paper: a tall view scrolls instead of spilling out
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {renderBody(view)}
        </Box>

        {renderFooter(view)}
      </Dialog>
    </>
  )
}
