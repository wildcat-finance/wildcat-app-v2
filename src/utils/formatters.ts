import {
  formatFixedBigint,
  MarketParameterConstraints,
  MarketParameters,
  stripTrailingZeroes,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { Dayjs } from "dayjs"
import duration from "dayjs/plugin/duration"
import { formatUnits } from "viem"

import { ROUTES } from "@/routes"
import { dayjs } from "@/utils/dayjs"

// <---- TIMESTAMP TO DATE FORMATTERS ---->

export const DATE_FORMAT_WITH_TIME = "DD-MMM-YYYY HH:mm"
export const DATE_FORMAT = "DD-MMM-YYYY"

// <---- FIXED TERM MATURITY (UTC) ---->

/**
 * A fixed term maturity is a calendar date, not an instant: the UI asks the
 * borrower which day the term ends and labels that day 00:00 UTC. Every place
 * that writes or renders it has to share that convention - otherwise the same
 * on-chain timestamp reads as a different day depending on the viewer's offset,
 * which is exactly how the adjust-maturity dialog and the status & details tab
 * came to disagree.
 *
 * The date pickers stay in the local dayjs mode MUI drives them with; these
 * helpers convert through the plain calendar date, so the day the borrower
 * clicked is the day that goes on chain regardless of their offset.
 */
export const MATURITY_DATE_FORMAT = "DD MMM YYYY"

const CALENDAR_DATE_FORMAT = "YYYY-MM-DD"

/** Unix seconds at 00:00 UTC of the calendar date a date picker is showing. */
export const pickerDateToUtcMaturity = (value: Dayjs): number =>
  dayjs.utc(value.format(CALENDAR_DATE_FORMAT)).unix()

/** The stored maturity as a picker value for the same calendar date. */
export const utcMaturityToPickerDate = (unixSeconds: number): Dayjs =>
  dayjs(dayjs.unix(unixSeconds).utc().format(CALENDAR_DATE_FORMAT))

/** Today in UTC, as a picker value - use for picker bounds so that the bounds
 *  and the value that gets stored are measured on the same calendar. */
export const utcTodayAsPickerDate = (): Dayjs =>
  dayjs(dayjs.utc().format(CALENDAR_DATE_FORMAT))

/** Compact maturity for chips and tables, e.g. "05 Aug 2026". */
export const formatUtcMaturityDate = (unixSeconds: number): string =>
  dayjs.unix(unixSeconds).utc().format(MATURITY_DATE_FORMAT)

/**
 * Maturity with its time of day, e.g. "05 Aug 2026 00:00 UTC". The time is
 * always shown rather than hard-coded to 00:00: markets deployed before this
 * convention was enforced sit at the borrower's local midnight, so their real
 * maturity is not midnight UTC and claiming otherwise would keep lying.
 */
export const formatUtcMaturity = (unixSeconds: number): string =>
  `${dayjs.unix(unixSeconds).utc().format(`${MATURITY_DATE_FORMAT} HH:mm`)} UTC`

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

export const formatSecsToHours = (seconds: number, short?: boolean) => {
  const s = Math.max(0, Math.floor(seconds))

  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const remainingSeconds = s % 60

  if (short) {
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`
    if (minutes > 0) return `${minutes} min`
    return "<1 min"
  }

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

export const localize = (
  tokenAmount: TokenAmount,
  decimals = TOKEN_FORMAT_DECIMALS,
  withSymbol = false,
) => {
  const text = tokenAmount.format(decimals)
  const [beforeDecimal, afterDecimal] = text.split(".")
  const beforeDecimalWithCommas = Number(beforeDecimal).toLocaleString("en-US")
  return [
    beforeDecimalWithCommas,
    ...(afterDecimal !== undefined ? [".", afterDecimal] : []),
    ...(withSymbol ? [" ", tokenAmount.symbol] : []),
  ].join("")
}

export const toTokenAmountProps = (
  tokenAmount: TokenAmount | undefined,
  defaultText = "-",
) => ({
  value: tokenAmount
    ? localize(tokenAmount, TOKEN_FORMAT_DECIMALS, true)
    : defaultText,
  valueTooltip: tokenAmount?.format(tokenAmount.decimals, true),
})

export const COMPACT_TOKEN_THRESHOLD = 1e9

export const formatTokenWithCommas = (
  tokenAmount: TokenAmount,
  params?: {
    withSymbol?: boolean
    fractionDigits?: number
    compact?: boolean
  },
) => {
  const parsedAmount = parseFloat(tokenAmount.format(tokenAmount.decimals))
  const useCompact =
    params?.compact && Math.abs(parsedAmount) >= COMPACT_TOKEN_THRESHOLD
  const parsedAmountWithComma = parsedAmount.toLocaleString(
    "en-US",
    useCompact
      ? { notation: "compact", maximumFractionDigits: 2 }
      : {
          maximumFractionDigits:
            params?.fractionDigits || TOKEN_FORMAT_DECIMALS,
        },
  )

  return `${parsedAmountWithComma}${
    params?.withSymbol ? ` ${tokenAmount.symbol}` : ""
  }`
}

export const formatNumberWithCommas = (
  value: number | undefined,
  fractionDigits: number = TOKEN_FORMAT_DECIMALS,
) =>
  (value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
  })

export const formatBps = (bps: number, fixed?: number) => {
  const fixedNum = (bps / 100).toFixed(fixed || 2)

  return stripTrailingZeroes(fixedNum)
}

export const formatRayAsPercentage = (ray: bigint, fixed?: number) => {
  const percentage = parseFloat(formatUnits(ray, 27)) * 100

  return stripTrailingZeroes(percentage.toFixed(fixed || 2))
}

export const formatTokenAmountPercentage = (
  total: TokenAmount,
  amount: TokenAmount,
) => {
  if (total.eq(0)) return 0

  return Number(
    formatFixedBigint(
      (amount.raw * BigInt(100) * BigInt("1000000000000000000")) / total.raw,
    ),
  )
}

export const buildMarketHref = (
  marketAddress: string,
  chainId?: number,
  baseRoute: string = ROUTES.lender.market,
) => {
  const base = `${baseRoute}/${marketAddress}`
  return chainId ? `${base}?chainId=${chainId}` : base
}

export const buildBorrowerProfileHref = (
  borrowerAddress: string,
  chainId?: number,
  from?: "borrower",
) => {
  const base = `${ROUTES.profile.borrower}/${borrowerAddress}`
  const query = new URLSearchParams()
  if (chainId) query.set("chainId", String(chainId))
  if (from) query.set("from", from)
  const search = query.toString()
  return search ? `${base}?${search}` : base
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
