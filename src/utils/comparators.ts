import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { MarketStatus } from "@/utils/marketStatus"

export const typeComparator = (
  v1:
    | { kind: HooksKind.FixedTerm; fixedPeriod: number }
    | { kind: HooksKind.Unknown | HooksKind.OpenTerm; fixedPeriod?: undefined },
  v2:
    | { kind: HooksKind.FixedTerm; fixedPeriod: number }
    | { kind: HooksKind.Unknown | HooksKind.OpenTerm; fixedPeriod?: undefined },
) => {
  const order: { [key in HooksKind]: number } = {
    [HooksKind.FixedTerm]: 0,
    [HooksKind.OpenTerm]: 1,
    [HooksKind.Unknown]: 2,
  }

  if (order[v1.kind] !== order[v2.kind]) {
    return order[v1.kind] - order[v2.kind]
  }

  if (v1.kind === HooksKind.FixedTerm && v2.kind === HooksKind.FixedTerm) {
    return v1.fixedPeriod - v2.fixedPeriod
  }

  return 0
}

export const statusComparator = (
  v1: {
    status: MarketStatus
    healthyPeriod: number
    penaltyPeriod: number
    delinquencyPeriod: number
  },
  v2: {
    status: MarketStatus
    healthyPeriod: number
    penaltyPeriod: number
    delinquencyPeriod: number
  },
) => {
  const statusOrder = (status: MarketStatus) => {
    switch (status) {
      case MarketStatus.HEALTHY:
        return 1
      case MarketStatus.DELINQUENT:
        return 2
      case MarketStatus.PENALTY:
        return 3
      case MarketStatus.TERMINATED:
        return 4
      default:
        return 5
    }
  }

  const statusComparison = statusOrder(v1.status) - statusOrder(v2.status)
  if (statusComparison !== 0) {
    return statusComparison
  }

  if (
    v1.status === MarketStatus.HEALTHY &&
    v2.status === MarketStatus.HEALTHY
  ) {
    return v2.healthyPeriod - v1.healthyPeriod
  }

  if (
    v1.status === MarketStatus.DELINQUENT &&
    v2.status === MarketStatus.DELINQUENT
  ) {
    return v1.delinquencyPeriod - v2.delinquencyPeriod
  }

  if (
    v1.status === MarketStatus.PENALTY &&
    v2.status === MarketStatus.PENALTY
  ) {
    return v1.penaltyPeriod - v2.penaltyPeriod
  }

  return 0
}

export const percentComparator = (v1: string, v2: string) => {
  const num1 = parseFloat(v1.replace("%", ""))
  const num2 = parseFloat(v2.replace("%", ""))
  return num1 - num2
}

export const capacityComparator = (v1: string, v2: string) => {
  const num1 = parseFloat(v1.replace(/,/g, ""))
  const num2 = parseFloat(v2.replace(/,/g, ""))
  return num1 - num2
}

const parseDateString = (dateString: string): Date => {
  const [datePart, timePart] = dateString.split(" ")
  const [day, month, year] = datePart.split("-")
  const [hours, minutes] = timePart.split(":")
  const monthIndex = new Date(`${month} 1, 2000`).getMonth()

  return new Date(
    Number(year),
    monthIndex,
    Number(day),
    Number(hours),
    Number(minutes),
  )
}

export const dateComparator = (v1: string, v2: string): number => {
  const date1 = parseDateString(v1)
  const date2 = parseDateString(v2)
  return date1.getTime() - date2.getTime()
}

export const tokenAmountComparator = (v1: TokenAmount, v2: TokenAmount) =>
  v1.gte(v2) ? 1 : -1
