import { TIMESTAMP_KEY } from "@/utils/constants"

export const getLastFetchedTimestamp = (): number => {
  const timestamp = parseInt(localStorage.getItem(TIMESTAMP_KEY) || "0", 10)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const setLastFetchedTimestamp = (timestamp: number) => {
  localStorage.setItem(TIMESTAMP_KEY, timestamp.toString())
}
