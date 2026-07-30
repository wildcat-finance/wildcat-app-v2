import { getAddress } from "viem"

import { formatUnixMsAsDate } from "@/utils/formatters"

const toUnixMs = (value: number): number => {
  // If value is in seconds, convert to milliseconds
  // Works for any unix timestamp prior to the year 22970 (lol)
  if (new Date(value).getFullYear() === 1970) {
    value *= 1000
  }
  return value
}

export const formatAddress = (value: string | undefined): string | undefined =>
  value ? getAddress(value) : undefined

export const formatDate = (value: number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return formatUnixMsAsDate(toUnixMs(value))
}
