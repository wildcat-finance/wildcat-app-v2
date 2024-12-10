import {
  Market,
  DepositAccess,
  TokenAmount,
  TransferAccess,
  getDeploymentAddress,
  HooksKind,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import humanizeDuration from "humanize-duration"
import { getAddress } from "viem"

import { TargetChainId } from "@/config/network"
import { formatBps } from "@/utils/formatters"

import { VerifiedSignature } from "./signatures/interface"

type NetworkData = {
  chainId?: number
  name?: string
}

export type BasicBorrowerInfo = {
  address: string
  name: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
}

const DepositAccessString = {
  [DepositAccess.Open]: "Open",
  [DepositAccess.RequiresCredential]: "Restricted",
}

const TransferAccessString = {
  [TransferAccess.Open]: "Open",
  [TransferAccess.RequiresCredential]: "Restricted",
  [TransferAccess.Disabled]: "Disabled",
}

const WithdrawalAccessString = {
  [WithdrawalAccess.Open]: "Open",
  [WithdrawalAccess.RequiresCredential]: "Restricted",
}

export const MlaFieldValueKeys = [
  // number
  "network.chainId",
  // string
  "network.name",
  "asset.name",
  "asset.symbol",
  "market.marketType",
  "market.name",
  "market.symbol",
  "borrower.name",
  "borrower.jurisdiction",
  "borrower.physicalAddress",
  "borrower.entityKind",
  // address (format as checksum address)
  "market.depositAccess",
  "market.transferAccess",
  "market.withdrawalAccess",
  "asset.address",
  "market.address",
  "borrower.address",
  "lender.address",
  "chainalysisOracle.address",
  "hooksFactory.address",
  // token amount
  "market.capacity",
  "market.minimumDeposit",
  // duration
  "market.delinquencyGracePeriod",
  "market.withdrawalBatchDuration",
  // Date
  "market.fixedTermEndTime",
  "borrower.timeSigned",
  "lender.timeSigned",
  "lender.timeSignedDayOrdinal",
  "lender.timeSignedMonthYear",
  "sla.timeUpdated",
  // bips (format as %)
  "market.apr",
  "market.delinquencyFee",
  "market.reserveRatio",
  // boolean (format as Yes, No, N/A)
  "market.allowClosureBeforeTerm",
  "market.allowTermReduction",
  "market.allowForceBuyBack",
] as const

export type MlaFieldValueKey = (typeof MlaFieldValueKeys)[number]
// // number
// | "network.chainId"
// // string
// | "network.name"
// | "asset.name"
// | "asset.symbol"
// | "market.marketType"
// | "market.name"
// | "market.symbol"
// | "borrower.name"
// | "borrower.jurisdiction"
// | "borrower.physicalAddress"
// | "borrower.entityKind"
// // address (format as checksum address)
// | "market.depositAccess"
// | "market.transferAccess"
// | "market.withdrawalAccess"
// | "asset.address"
// | "market.address"
// | "borrower.address"
// | "lender.address"
// | "chainalysisOracle.address"
// | "hooksFactory.address"
// // token amount
// | "market.capacity"
// | "market.minimumDeposit"
// // duration
// | "market.delinquencyGracePeriod"
// | "market.withdrawalBatchDuration"
// // Date
// | "market.fixedTermEndTime"
// | "borrower.timeSigned"
// | "lender.timeSigned"
// | "lender.timeSignedDayOrdinal"
// | "lender.timeSignedMonthYear"
// | "sla.timeUpdated"
// // bips (format as %)
// | "market.apr"
// | "market.delinquencyFee"
// | "market.reserveRatio"
// // boolean (format as Yes, No, N/A)
// | "market.allowClosureBeforeTerm"
// | "market.allowTermReduction"
// | "market.allowForceBuyBack"

export type MlaTemplateField = {
  /* one of the possible field keys */
  source: MlaFieldValueKey
  /* text to use when value is unavailable */
  placeholder: string
}

type MlaTemplate = {
  html: string
  plaintext: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}

const formatBool = (value: boolean | undefined): string | undefined => {
  if (value === undefined) return undefined
  return value ? "Yes" : "No"
}

const formatString = (value: string | undefined): string | undefined =>
  value ?? undefined

const formatAddress = (value: string | undefined): string | undefined =>
  value ? getAddress(value) : undefined

const formatNumber = (value: number | undefined): string | undefined =>
  value ? value.toString() : undefined

const formatBips = (value: number | undefined): string | undefined =>
  value ? `${formatBps(value)}%` : undefined

const formatTokenAmount = (
  value: TokenAmount | undefined,
): string | undefined => {
  if (value === undefined) return undefined
  return value.format(undefined, true)
}

const toUnixMs = (value: number): number => {
  // If value is in seconds, convert to milliseconds
  // Works for any unix timestamp prior to the year 22970 (lol)
  if (new Date(value).getFullYear() === 1970) {
    value *= 1000
  }
  return value
}

const formatDate = (value: number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return dayjs(toUnixMs(value)).format("MMMM DD, YYYY")
}

const formatDuration = (value: number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return humanizeDuration(toUnixMs(value))
}

type LenderKeys =
  | "lender.timeSigned"
  | "lender.timeSignedDayOrdinal"
  | "lender.timeSignedMonthYear"
  | "lender.address"

type BorrowerSignedMla = {
  // HTML after filling in all borrower fields
  html: string
  // Plaintext after filling in all borrower fields
  plaintext: string
  lenderFields: MlaTemplateField[]
}

export function getFieldValuesForBorrower(
  market: Market,
  borrowerInfo: BasicBorrowerInfo,
  networkData: NetworkData,
  borrowerTimeSigned: number,
  lastSlaUpdateTime: number,
) {
  const { underlyingToken: asset, hooksConfig } = market
  const marketAddress = `0x${market.address}` // @todo: calculate market address
  const marketName = market.name
  const marketSymbol = market.symbol
  // Deposits are only open if `depositRequiresAccess` is defined and false
  const depositAccess =
    hooksConfig?.depositRequiresAccess === false
      ? DepositAccess.Open
      : DepositAccess.RequiresCredential

  let withdrawalAccess: WithdrawalAccess
  if (hooksConfig) {
    if (
      hooksConfig.flags.useOnQueueWithdrawal &&
      (hooksConfig.kind === HooksKind.OpenTerm ||
        hooksConfig.queueWithdrawalRequiresAccess)
    ) {
      withdrawalAccess = WithdrawalAccess.RequiresCredential
    } else {
      withdrawalAccess = WithdrawalAccess.Open
    }
  } else {
    withdrawalAccess = WithdrawalAccess.Open
  }
  let transferAccess: TransferAccess
  if (hooksConfig) {
    if (hooksConfig.transfersDisabled) {
      transferAccess = TransferAccess.Disabled
    } else if (hooksConfig.transferRequiresAccess) {
      transferAccess = TransferAccess.RequiresCredential
    } else {
      transferAccess = TransferAccess.Open
    }
  } else {
    transferAccess = TransferAccess.Open
  }

  const allData: Map<MlaFieldValueKey, string | undefined> = new Map([
    // number
    ["network.chainId", formatNumber(networkData.chainId)],
    // string
    ["network.name", formatString(networkData.name)],
    ["asset.name", formatString(asset.name)],
    ["asset.symbol", formatString(asset.symbol)],
    [
      "market.marketType",
      formatString(
        market.hooksKind === HooksKind.FixedTerm ? "Fixed Term" : "Open Term",
      ),
    ],
    ["market.name", formatString(marketName)],
    ["market.symbol", formatString(marketSymbol)],
    ["borrower.name", formatString(borrowerInfo.name)],
    ["borrower.jurisdiction", formatString(borrowerInfo.jurisdiction)],
    ["borrower.physicalAddress", formatString(borrowerInfo.physicalAddress)],
    // address (format as checksum address)
    ["market.depositAccess", formatString(DepositAccessString[depositAccess])],
    [
      "market.transferAccess",
      formatString(TransferAccessString[transferAccess]),
    ],
    [
      "market.withdrawalAccess",
      formatString(WithdrawalAccessString[withdrawalAccess]),
    ],
    ["asset.address", formatAddress(asset.address)],
    ["market.address", formatAddress(marketAddress)],
    ["borrower.address", formatAddress(borrowerInfo.address)],
    // ["lender.address", formatAddress(marketParams.lenderAddress)],
    [
      /* @todo should be Chainalysis */
      "chainalysisOracle.address",
      formatAddress(getDeploymentAddress(TargetChainId, "MockChainalysis")),
    ],
    [
      "hooksFactory.address",
      formatAddress(getDeploymentAddress(TargetChainId, "HooksFactory")),
    ],
    // token amount
    ["market.capacity", formatTokenAmount(market.maxTotalSupply)],
    [
      "market.minimumDeposit",
      hooksConfig?.minimumDeposit
        ? formatTokenAmount(hooksConfig.minimumDeposit)
        : "N/A",
    ],
    // duration
    [
      "market.delinquencyGracePeriod",
      formatDuration(market.delinquencyGracePeriod),
    ],
    [
      "market.withdrawalBatchDuration",
      formatDuration(market.withdrawalBatchDuration),
    ],
    // date
    [
      "market.fixedTermEndTime",
      formatDate(
        hooksConfig?.kind === HooksKind.FixedTerm
          ? hooksConfig.fixedTermEndTime
          : undefined,
      ),
    ],
    ["borrower.timeSigned", formatDate(borrowerTimeSigned)],
    // ["lender.timeSigned", formatDate(Date.now())],
    ["sla.timeUpdated", formatDate(lastSlaUpdateTime)],
    // bips (format as %)
    ["market.apr", formatBips(market.annualInterestBips)],
    ["market.delinquencyFee", formatBips(market.delinquencyFeeBips)],
    ["market.reserveRatio", formatBips(market.reserveRatioBips)],
    // boolean (format as Yes, No, N/A)
    [
      "market.allowClosureBeforeTerm",
      hooksConfig?.kind === HooksKind.FixedTerm
        ? formatBool(hooksConfig.allowClosureBeforeTerm)
        : "N/A",
    ],
    [
      "market.allowTermReduction",
      hooksConfig?.kind === HooksKind.FixedTerm
        ? formatBool(hooksConfig.allowTermReduction)
        : "N/A",
    ],
    [
      "market.allowForceBuyBack",
      hooksConfig?.kind === HooksKind.FixedTerm
        ? formatBool(hooksConfig.allowForceBuyBacks)
        : "N/A",
    ],
  ])
  return allData
}

const nth = (d: number) => {
  const dString = String(d)
  const last = +dString.slice(-2)
  if (last > 3 && last < 21) return "th"
  switch (last % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function getFieldValuesForLender(
  lenderAddress: string,
  lenderTimeSigned: number,
) {
  const date = new Date(lenderTimeSigned)
  const data: Map<LenderKeys, string | undefined> = new Map([
    ["lender.timeSigned", formatDate(lenderTimeSigned)],
    ["lender.timeSignedDayOrdinal", nth(date.getUTCDate())],
    [
      "lender.timeSignedMonthYear",
      date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    ],
    ["lender.address", formatAddress(lenderAddress)],
  ])
  return data
}

export function fillInMlaTemplate(
  template: MlaTemplate,
  fieldValues: Map<MlaFieldValueKey, string | undefined>,
) {
  let { html, plaintext } = template
  template.borrowerFields.forEach((field) => {
    const value = fieldValues.get(field.source) ?? field.placeholder
    plaintext = plaintext.replaceAll(`{{${field.source}}}`, value)
    html = html.replaceAll(`{{${field.source}}}`, value)
  })
  return {
    html,
    plaintext,
  }
}

export function fillInMlaForLender(
  mla: BorrowerSignedMla,
  values: Map<MlaFieldValueKey, string | undefined>,
) {
  let { html, plaintext } = mla
  mla.lenderFields.forEach((field) => {
    const value = values.get(field.source) ?? field.placeholder
    plaintext = plaintext.replaceAll(`{{${field.source}}}`, value)
    html = html.replaceAll(`{{${field.source}}}`, value)
  })
  return { html, plaintext }
}
