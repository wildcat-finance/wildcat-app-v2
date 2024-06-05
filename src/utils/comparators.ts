import { MarketStatus } from "@/utils/marketStatus"

export const statusComparator = (
  v1: {
    status: MarketStatus
    healthyPeriod: number
    penaltyPeriod: number
  },
  v2: {
    status: MarketStatus
    healthyPeriod: number
    penaltyPeriod: number
  },
) => {
  const statusOrder = (status: MarketStatus) => {
    switch (status) {
      case MarketStatus.HEALTHY:
        return 1
      case MarketStatus.PENALTY:
        return 2
      default:
        return 3
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
  return v1.penaltyPeriod - v2.penaltyPeriod
}

export const percentComparator = (v1: string, v2: string) => {
  const num1 = parseFloat(v1.replace("%", ""))
  const num2 = parseFloat(v2.replace("%", ""))
  return num1 - num2
}

export const capacityComparator = (v1: string, v2: string) => {
  const num1 = parseFloat(v1.replace(",", ""))
  const num2 = parseFloat(v2.replace(",", ""))
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
