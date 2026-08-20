import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import { TransactionBlockRow } from "@/components/TransactionBlock/interface"
import { formatTokenWithCommas } from "@/utils/formatters"

type MarketActionRowLabels = {
  walletBalance: string
  minimumDeposit: string
  withdrawalCycle: string
  gracePeriod: string
}

export const getMarketActionRows = (
  marketAccount: MarketAccount,
  labels: MarketActionRowLabels,
): {
  depositRows: TransactionBlockRow[]
  withdrawRows: TransactionBlockRow[]
} => {
  const { market, underlyingBalance } = marketAccount
  const {
    underlyingToken: { symbol },
    hooksConfig,
    withdrawalBatchDuration,
    delinquencyGracePeriod,
  } = market
  const { minimumDeposit } = hooksConfig ?? {}
  const formatDuration = (seconds: number) =>
    humanizeDuration(seconds * 1000, { largest: 1, round: true })

  return {
    depositRows: [
      {
        label: labels.walletBalance,
        value: `${formatTokenWithCommas(underlyingBalance)} ${symbol}`,
      },
      ...(minimumDeposit
        ? [
            {
              label: labels.minimumDeposit,
              value: `${formatTokenWithCommas(minimumDeposit)} ${symbol}`,
            },
          ]
        : []),
    ],
    withdrawRows: [
      {
        label: labels.withdrawalCycle,
        value: formatDuration(withdrawalBatchDuration),
      },
      {
        label: labels.gracePeriod,
        value: formatDuration(delinquencyGracePeriod),
      },
    ],
  }
}
