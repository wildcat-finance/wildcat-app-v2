/* eslint-disable no-underscore-dangle */
import { MarketRecord } from "@wildcatfi/wildcat-sdk"

import {
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"

const SECONDS_PER_DAY = 86_400
const MAX_PERIODIC_TERM_DECIMALS = 5

const formatAmountDisplay = (
  tokenAmount: Parameters<typeof formatTokenWithCommas>[0],
) => formatTokenWithCommas(tokenAmount, { withSymbol: true })

const formatAmountRaw = (
  tokenAmount: Parameters<typeof formatTokenWithCommas>[0],
) => `${tokenAmount.format(tokenAmount.decimals)} ${tokenAmount.symbol}`

const formatDurationDays = (seconds: number) => {
  const days = seconds / SECONDS_PER_DAY
  const formatted = days.toLocaleString("en-US", {
    maximumFractionDigits: MAX_PERIODIC_TERM_DECIMALS,
  })

  return `${formatted} day${days === 1 ? "" : "s"}`
}

const formatPeriodicTermChange = (
  label: string,
  oldValue: number,
  newValue: number,
  format: (value: number) => string,
) => {
  if (oldValue === newValue) return undefined

  return `${label} ${format(oldValue)} -> ${format(newValue)}`
}

export const getRecordText = (
  record: MarketRecord,
  lenderNames: { [key: string]: string },
  borrowerName: string,
  raw = false,
): string => {
  const fmt = raw ? formatAmountRaw : formatAmountDisplay

  if (record.__typename === "AnnualInterestBipsUpdated") {
    return `Base APR changed from ${record.oldAnnualInterestBips / 100}% to ${
      record.newAnnualInterestBips / 100
    }%`
  }
  if (record.__typename === "Borrow") {
    return `${borrowerName} borrowed ${fmt(record.amount)}`
  }
  if (record.__typename === "DebtRepaid") {
    return `${borrowerName} repaid ${fmt(record.amount)}`
  }
  if (record.__typename === "Deposit") {
    const lenderName = lenderNames[record.address.toLowerCase()]
    const label = lenderName ?? trimAddress(record.address)
    return `${label} loaned ${fmt(record.amount)}`
  }
  if (record.__typename === "DelinquencyStatusChanged") {
    if (!record.isDelinquent) return `Market back in good standing`
    const delinquentAmount = record.liquidityCoverageRequired.satsub(
      record.totalAssets,
    )
    return `Market delinquent by ${fmt(delinquentAmount)}`
  }
  if (record.__typename === "FeesCollected") {
    return `${fmt(record.amount)} collected in protocol fees`
  }
  if (record.__typename === "MarketClosed") {
    return `Market closed`
  }
  if (record.__typename === "WithdrawalRequest") {
    const lenderName = lenderNames[record.address.toLowerCase()]
    const label = lenderName ?? trimAddress(record.address)
    return `${label} requested a withdrawal of ${fmt(record.normalizedAmount)}`
  }
  if (record.__typename === "MaxTotalSupplyUpdated") {
    const kind = record.newMaxTotalSupply.gt(record.oldMaxTotalSupply)
      ? "increased"
      : "reduced"
    return `Market capacity ${kind} to ${fmt(record.newMaxTotalSupply)}`
  }
  if (record.__typename === "MinimumDepositUpdated") {
    return `Minimum deposit updated to ${fmt(record.newMinimumDeposit)}`
  }
  if (record.__typename === "ProtocolFeeBipsUpdated") {
    return `Protocol fee updated to ${record.newProtocolFeeBips / 100}%`
  }
  if (record.__typename === "FixedTermUpdated") {
    const time = timestampToDateFormatted(record.newFixedTermEndTime)

    return `Market maturity updated to ${time}`
  }
  if (record.__typename === "PeriodicTermUpdated") {
    const changes = [
      formatPeriodicTermChange(
        "first window",
        record.oldFirstWithdrawalWindowStart,
        record.newFirstWithdrawalWindowStart,
        timestampToDateFormatted,
      ),
      formatPeriodicTermChange(
        "withdrawal period",
        record.oldPeriodDuration,
        record.newPeriodDuration,
        formatDurationDays,
      ),
      formatPeriodicTermChange(
        "withdrawal window",
        record.oldWithdrawalWindowDuration,
        record.newWithdrawalWindowDuration,
        formatDurationDays,
      ),
    ].filter(Boolean)

    return `Periodic withdrawal terms updated${
      changes.length ? `: ${changes.join(", ")}` : ""
    }`
  }
  if (record.__typename === "PeriodicTermClosed") {
    return `Periodic term closed`
  }
  if (record.__typename === "AnnualInterestBipsReductionProposed") {
    const start = timestampToDateFormatted(record.responseWindowStart)
    const end = timestampToDateFormatted(record.responseWindowEnd)

    return `Base APR reduction proposed to ${
      record.annualInterestBips / 100
    }%; lender response window ${start} to ${end}`
  }
  return ""
}
