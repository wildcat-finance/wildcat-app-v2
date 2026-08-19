import { useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import {
  HooksKind,
  QueueWithdrawalStatus,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
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
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"
import { isPeriodicWithdrawalWindowClosed } from "@/utils/periodicWithdrawalWindow"

import { WithdrawDone } from "./components/WithdrawDone"
import { WithdrawForm } from "./components/WithdrawForm"
import { StepRow, WithdrawSteps } from "./components/WithdrawSteps"
import { WithdrawModalProps } from "./interface"

/** Fixed dialog height: every view is laid out inside the same box. */
const DIALOG_HEIGHT = "493px"

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

  // /**
  //  * The form is the tallest view. Remember its height and hold it for the rest
  //  * of the flow so the dialog does not resize from step to step. Kept as a
  //  * minimum (never a fixed height) so unusually long content can still grow.
  //  */
  // const paperRef = useRef<HTMLDivElement>(null)
  // const [lockedHeight, setLockedHeight] = useState<number>()

  const routing = useWithdrawRouting({ marketAccount, wrapper, hasWrapper })
  const flow = useWithdrawFlow({ marketAccount, wrapper })

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
      "lenderMarketDetails.transactions.withdraw.periodicWindow.closed",
    )
  } else if (availability !== QueueWithdrawalStatus.Ready) {
    blockingError = SDK_ERRORS_MAPPING.queueWithdrawal[availability]
  }

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

  const isOpen = isMobile ? !!isMobileOpen : isDesktopOpen

  const handleClose = () => {
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

  const handleConfirm = () => {
    setSnapshotShares(routing.sharesToUnwrap)
    flow.begin(routing.route)
  }

  // ---- step rows ----
  const stepRows: StepRow[] = React.useMemo(() => {
    const { snapshot } = flow
    if (!snapshot) return []

    const statusLabel = (status: LegStatus) => {
      switch (status) {
        case LegStatus.Done:
          return t(
            "lenderMarketDetails.transactions.withdraw.steps.status.done",
          )
        case LegStatus.Failed:
          return t(
            "lenderMarketDetails.transactions.withdraw.steps.status.failed",
          )
        case LegStatus.Busy:
          return t(
            "lenderMarketDetails.transactions.withdraw.steps.status.confirming",
          )
        case LegStatus.Waiting:
          return t(
            "lenderMarketDetails.transactions.withdraw.steps.status.waiting",
          )
        default:
          return t(
            "lenderMarketDetails.transactions.withdraw.steps.status.next",
          )
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
            "lenderMarketDetails.transactions.withdraw.steps.unwrap.title",
          ),
          detail: sharesAmount
            ? t(
                "lenderMarketDetails.transactions.withdraw.steps.unwrap.detail",
                {
                  shares: formatTokenWithCommas(sharesAmount),
                  shareSymbol,
                  amount: formatTokenWithCommas(snapshot.fromWrapped),
                  symbol,
                },
              )
            : t(
                "lenderMarketDetails.transactions.withdraw.steps.unwrap.detailNoShares",
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
            "lenderMarketDetails.transactions.withdraw.steps.batched.title",
          ),
          detail: t(
            "lenderMarketDetails.transactions.withdraw.steps.batched.detail",
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
        title: t("lenderMarketDetails.transactions.withdraw.steps.queue.title"),
        detail: snapshot.usesWrapped
          ? t("lenderMarketDetails.transactions.withdraw.steps.queue.detail", {
              amount: totalLabel,
              symbol,
            })
          : t(
              "lenderMarketDetails.transactions.withdraw.steps.queue.detailDirect",
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
      return t("lenderMarketDetails.transactions.withdraw.confirm.exceeds")
    if (!routing.isValid || blockingError)
      return t("lenderMarketDetails.transactions.withdraw.confirm.enterAmount")
    return t("lenderMarketDetails.transactions.withdraw.confirm.withdraw", {
      amount: formatTokenWithCommas(routing.route.amount),
      symbol,
      count: previewLegCount,
    })
  })()

  const signLabel = (() => {
    if (flow.busy)
      return t("lenderMarketDetails.transactions.withdraw.steps.signBusy")
    const leg = stepRows[flow.currentLeg]
    if (flow.failed && leg) {
      return t("lenderMarketDetails.transactions.withdraw.steps.retry", {
        title: leg.title,
      })
    }
    if (flow.legs.length <= 1)
      return t("lenderMarketDetails.transactions.withdraw.steps.signOne")
    return t("lenderMarketDetails.transactions.withdraw.steps.signMany", {
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
      />
    </Box>
  )

  const stepsBody = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <WithdrawSteps
        headerLabel={t(
          "lenderMarketDetails.transactions.withdraw.steps.header",
        )}
        amountLabel={`${formatTokenWithCommas(
          flow.snapshot?.amount ?? routing.route.amount,
        )} ${symbol}`}
        rows={stepRows}
      />
      {flow.failed && !!flow.error && (
        <Typography variant="text3" color={COLORS.dullRed}>
          {flow.error}
        </Typography>
      )}
    </Box>
  )

  const doneBody = (
    <WithdrawDone
      onClose={handleClose}
      txHash={flow.result?.txHash}
      title={t("lenderMarketDetails.transactions.withdraw.success.title")}
      subtitle={t(
        "lenderMarketDetails.transactions.withdraw.success.subtitle",
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
    <WithdrawDone
      onClose={handleClose}
      txHash={flow.txHash}
      title={t("lenderMarketDetails.transactions.withdraw.proposed.title")}
      subtitle={t(
        "lenderMarketDetails.transactions.withdraw.proposed.subtitle",
        { count: flow.safeThreshold },
      )}
    />
  )

  const loadingBody = (
    <LoadingModal txHash={flow.txHash} subtitle={stepRows[0]?.title} />
  )

  const errorBody = (
    <ErrorModal
      onTryAgain={() => {
        flow.signCurrent()
      }}
      onClose={handleClose}
      txHash={flow.txHash}
      subtitle={flow.error}
    />
  )

  const body = (() => {
    if (view === "form") return formBody
    if (view === "steps") return stepsBody
    if (view === "loading") return loadingBody
    if (view === "error") return errorBody
    if (view === "done") return doneBody
    return proposedBody
  })()

  const footer = (() => {
    if (view === "form") {
      return (
        <TxModalFooter
          mainBtnText={confirmLabel}
          mainBtnOnClick={handleConfirm}
          disableMainBtn={!routing.isValid || !!blockingError}
        />
      )
    }
    if (view === "loading" || view === "error") return null
    if (view === "steps") {
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
          "lenderMarketDetails.transactions.withdraw.success.back",
        )}
        mainBtnOnClick={handleClose}
      />
    )
  })()

  // ---- mobile ----
  if (isMobile && isMobileOpen) {
    return (
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
          label={t("lenderMarketDetails.transactions.withdraw.modal.title")}
          arrowOnClick={
            // eslint-disable-next-line no-nested-ternary
            view === "form"
              ? handleClose
              : canGoBackToForm
                ? handleBackToForm
                : null
          }
          crossOnClick={handleClose}
          progress={view === "form" ? 50 : 100}
        />

        <Box
          sx={{
            padding: "24px 20px 16px",
            width: "100%",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {body}
        </Box>

        {footer}
      </Box>
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
          ? t("lenderMarketDetails.transactions.withdraw.buttonLocked")
          : t("lenderMarketDetails.transactions.withdraw.button")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={flow.busy ? undefined : handleClose}
        sx={{
          "& .MuiDialog-paper": {
            height: DIALOG_HEIGHT,
            minHeight: DIALOG_HEIGHT,
            maxHeight: DIALOG_HEIGHT,
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
            title={t("lenderMarketDetails.transactions.withdraw.modal.title")}
            arrowOnClick={canGoBackToForm ? handleBackToForm : null}
            crossOnClick={flow.busy ? null : handleClose}
          />
        )}

        {/* flex:1 makes the body absorb the paper's spare height so the footer
            is pinned to the bottom instead of leaving dead space under it */}
        <Box
          width="100%"
          padding={
            view === "loading" || view === "error" ? "0 0 16px" : "0 24px 16px"
          }
          marginTop="16px"
          sx={{
            flex: 1,
            // fixed-height paper: a tall view scrolls instead of spilling out
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {body}
        </Box>

        {footer}
      </Dialog>
    </>
  )
}
