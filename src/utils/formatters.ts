import {
  MarketParameterConstraints,
  MarketParameters,
  stripTrailingZeroes,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import duration from "dayjs/plugin/duration"
import { BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"

import { dayjs } from "@/utils/dayjs"

// <---- TIMESTAMP TO DATE FORMATTERS ---->

export const DATE_FORMAT_WITH_TIME = "DD-MMM-YYYY HH:mm"
export const DATE_FORMAT = "DD-MMM-YYYY"

export const formatUnixMsAsDate = (unixMs: number) =>
  dayjs(unixMs).utc().format("MMMM DD, YYYY")

export const timestampToDateFormatted = (
  timestamp: number,
  dateFormat = DATE_FORMAT_WITH_TIME,
) => dayjs(timestamp * 1000).format(dateFormat)

dayjs.extend(duration)

export function secondsToDays(seconds: number) {
  return dayjs.duration(seconds, "seconds").asDays()
}

export function remainingMillisecondsToDate(milliseconds: number): string {
  const now = new Date()
  const futureDate = new Date(now.getTime() + milliseconds)
  const day = futureDate.getDate().toString().padStart(2, "0")
  const month = (futureDate.getMonth() + 1).toString().padStart(2, "0") // Months are zero-based
  const year = futureDate.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date

  return (
    `${d.getDate().toString().padStart(2, "0")}.` +
    `${(d.getMonth() + 1).toString().padStart(2, "0")}.` +
    `${d.getFullYear()}`
  )
}

// <---- MARKET CONSTRAINTS ---->

const CONSTRAINTS_IN_SECONDS: Array<keyof MarketParameterConstraints> = [
  "minimumDelinquencyGracePeriod",
  "maximumDelinquencyGracePeriod",
  "minimumWithdrawalBatchDuration",
  "maximumWithdrawalBatchDuration",
]

export function formatConstrainToNumber(
  constraints: MarketParameterConstraints,
  key: keyof MarketParameterConstraints,
) {
  if (CONSTRAINTS_IN_SECONDS.indexOf(key) !== -1) {
    return constraints[key] / 60 / 60
  }

  return constraints[key] / 100
}

export const formatSecsToHours = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  let timeString = ""

  if (hours > 0) {
    timeString += `${hours} hour${hours > 1 ? "s" : ""} `
  }
  if (minutes > 0) {
    timeString += `${minutes} minute${minutes > 1 ? "s" : ""} `
  }
  if (remainingSeconds > 0 || timeString === "") {
    timeString += `${remainingSeconds} sec${remainingSeconds > 1 ? "s" : ""}`
  }

  return timeString.trim()
}

// <---- MARKET PARAMETERS FORMATTERS ---->
export const TOKEN_FORMAT_DECIMALS = 5
export const MARKET_PERCENTAGE_PARAM_DECIMALS = 2

export const MARKET_PARAMS_DECIMALS: Partial<{
  [key in keyof MarketParameters]: number
}> = {
  maxTotalSupply: TOKEN_FORMAT_DECIMALS,
  reserveRatioBips: MARKET_PERCENTAGE_PARAM_DECIMALS,
  annualInterestBips: MARKET_PERCENTAGE_PARAM_DECIMALS,
  delinquencyFeeBips: MARKET_PERCENTAGE_PARAM_DECIMALS,
  delinquencyGracePeriod: 1,
  withdrawalBatchDuration: 1,
}

export const localize = (n: number | string) => {
  const text = typeof n === "number" ? n.toString() : n
  const [beforeDecimal, afterDecimal] = text.split(".")
  const beforeDecimalWithCommas = Number(beforeDecimal).toLocaleString("en-US")
  return [
    beforeDecimalWithCommas,
    ...(afterDecimal !== undefined ? [".", afterDecimal] : []),
  ].join("")
}

export const localizeTokenAmount = (
  tokenAmount: TokenAmount,
  decimals = TOKEN_FORMAT_DECIMALS,
  withSymbol = false,
) => {
  const text = tokenAmount.format(decimals)
  return [
    localize(text),
    ...(withSymbol ? [" ", tokenAmount.symbol] : []),
  ].join("")
}

export const toTokenAmountProps = (
  tokenAmount: TokenAmount | undefined,
  defaultText = "-",
) => ({
  value: tokenAmount
    ? localizeTokenAmount(tokenAmount, TOKEN_FORMAT_DECIMALS, true)
    : defaultText,
  valueTooltip: tokenAmount?.format(tokenAmount.decimals, true),
})

export const formatTokenWithCommas = (
  tokenAmount: TokenAmount,
  params?: {
    withSymbol?: boolean
    fractionDigits?: number
  },
) => {
  const parsedAmount = parseFloat(tokenAmount.format(tokenAmount.decimals))
  const parsedAmountWithComma = parsedAmount.toLocaleString("en-US", {
    maximumFractionDigits: params?.fractionDigits || TOKEN_FORMAT_DECIMALS,
  })

  return `${parsedAmountWithComma}${
    params?.withSymbol ? ` ${tokenAmount.symbol}` : ""
  }`
}

export const formatBps = (bps: number, fixed?: number) => {
  const fixedNum = (bps / 100).toFixed(fixed || 2)

  return stripTrailingZeroes(fixedNum)
}

export const formatRayAsPercentage = (ray: BigNumber, fixed?: number) => {
  const percentage = parseFloat(formatUnits(ray, 27)) * 100

  return stripTrailingZeroes(percentage.toFixed(fixed || 2))
}

// <---- TOKEN PARAMETERS FORMATTERS ---->
export const trimAddress = (
  address: string,
  maxLength: number | undefined = 6,
) =>
  `${address.slice(0, 6)}...${address.slice(-(maxLength - 2), address.length)}`

export const formatTokenAmount = (
  amount: bigint,
  tokenDecimals: number,
  formatDecimalsLimit: number | undefined = 2,
) => {
  const formattedAmount = formatUnits(amount, tokenDecimals)

  return formatDecimalsLimit
    ? Number(formattedAmount).toFixed(formatDecimalsLimit)
    : formattedAmount
}

export const formatBlockTimestamp = (
  blockTimestamp: number,
  opts?: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...opts,
  }).format(new Date(blockTimestamp * 1000))
