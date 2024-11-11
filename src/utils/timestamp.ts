import { TIMESTAMP_KEY } from "@/utils/constants"

export const getLastFetchedTimestamp = (address: `0x${string}`) => {
  const timestamp = parseInt(
    localStorage.getItem(`${TIMESTAMP_KEY}_${address}`) || "0",
    10,
  )
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const setLastFetchedTimestamp = (
  timestamp: number,
  address: `0x${string}`,
) => {
  localStorage.setItem(`${TIMESTAMP_KEY}_${address}`, timestamp.toString())
}
