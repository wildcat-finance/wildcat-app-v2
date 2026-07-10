import { useCallback, useState } from "react"

import type { SxProps, Theme } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { PeriodicNoticeBanner } from "@/components/PeriodicNoticeBanner"
import { useLiveNowSeconds } from "@/hooks/useLiveNowSeconds"
import { formatBps, MARKET_PARAMS_DECIMALS } from "@/utils/formatters"
import { getPendingPeriodicAprChange } from "@/utils/periodicApr"
import { formatPeriodicWithdrawalWindowStart } from "@/utils/periodicWithdrawalWindow"

const readDismissed = (storageKey: string) => {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(storageKey) === "1"
}

/**
 * Dismissal persists per proposal AND per phase: hiding the early heads-up
 * must not suppress the urgent exit-now warning when the response window
 * opens, and a re-proposal (new proposalTimestamp) starts fresh.
 */
const useDismissedNotice = (storageKey: string) => {
  const [, setDismissCount] = useState(0)
  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1")
    }
    setDismissCount((count) => count + 1)
  }, [storageKey])
  return { isDismissed: readDismissed(storageKey), dismiss }
}

/**
 * Lender-facing notice for a pending periodic APR reduction. The response
 * window is the lender's only chance to exit at the old rate, so this stays
 * visible across the market page rather than being buried in parameters:
 *  - before the window: what was proposed and when lenders can respond;
 *  - during the window (urgent): countdown to act;
 *  - after the window: the cut can land at any moment.
 * Hidden once the proposal expires on-chain or the market/term is closed.
 */
export const PendingAprReductionBanner = ({
  market,
  sx,
}: {
  market: Market
  sx?: SxProps<Theme>
}) => {
  const { t } = useTranslation()

  const hasProposal =
    !!market.periodicHooksConfig?.pendingAprChangeProposalTimestamp
  // Tick while a proposal is live so the phase and countdown track real time.
  const nowSec = useLiveNowSeconds(
    hasProposal &&
      !market.isClosed &&
      !market.periodicHooksConfig?.periodicTermClosed,
  )
  const pendingChange = getPendingPeriodicAprChange(market, nowSec)

  const phase = (() => {
    if (!pendingChange) return undefined
    if (pendingChange.isResponseWindowOpen) return "exitNow" as const
    if (pendingChange.isResponseWindowElapsed) return "elapsed" as const
    return "proposed" as const
  })()

  const { isDismissed, dismiss } = useDismissedNotice(
    `pthAprReductionDismissed:${
      market.chainId
    }:${market.address.toLowerCase()}:${
      pendingChange?.proposalTimestamp ?? 0
    }:${phase ?? "none"}`,
  )

  if (
    !pendingChange ||
    !phase ||
    pendingChange.isExpired ||
    market.isClosed ||
    market.periodicHooksConfig?.periodicTermClosed ||
    isDismissed
  ) {
    return null
  }

  const interpolation = {
    currentApr: formatBps(
      market.annualInterestBips,
      MARKET_PARAMS_DECIMALS.annualInterestBips,
    ),
    proposedApr: formatBps(
      pendingChange.proposedAprBips,
      MARKET_PARAMS_DECIMALS.annualInterestBips,
    ),
    windowStart: formatPeriodicWithdrawalWindowStart(
      pendingChange.responseWindowStart,
    ),
    windowEnd: formatPeriodicWithdrawalWindowStart(
      pendingChange.responseWindowEnd,
    ),
    countdown: humanizeDuration(
      Math.max(0, pendingChange.responseWindowEnd - nowSec) * 1000,
      { round: true, largest: 2 },
    ),
  }

  return (
    <PeriodicNoticeBanner
      tone={phase === "exitNow" ? "warning" : "info"}
      title={t(`lenderMarketDetails.pendingAprReduction.${phase}.title`, {
        ...interpolation,
      })}
      body={t(`lenderMarketDetails.pendingAprReduction.${phase}.body`, {
        ...interpolation,
      })}
      onClose={dismiss}
      sx={sx}
    />
  )
}
