import type { Market } from "@wildcatfi/wildcat-sdk"

import { dayjs } from "@/utils/dayjs"

export const isPeriodicWithdrawalWindowClosed = (market: Market) =>
  !!market.periodicHooksConfig && !market.isPeriodicWithdrawalWindowOpen

export const formatPeriodicWithdrawalWindowStart = (timestamp: number) =>
  dayjs.unix(timestamp).utc().format("D MMM YYYY, HH:mm [UTC]")
