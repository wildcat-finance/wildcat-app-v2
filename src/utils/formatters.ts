import {
  MarketParameterConstraints,
  MarketParameters,
  stripTrailingZeroes,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"

// <---- TIMESTAMP TO DATE FORMATTERS ---->

export const DATE_FORMAT = "DD-MMM-YYYY HH:mm"
export const timestampToDateFormatted = (timestamp: number) =>
  dayjs(timestamp * 1000).format(DATE_FORMAT)

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
