import {
  Market,
  DepositAccess,
  TokenAmount,
  TransferAccess,
  getDeploymentAddress,
  HooksKind,
  WithdrawalAccess,
  Token,
} from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import { toUtf8Bytes } from "ethers/lib/utils"
import humanizeDuration from "humanize-duration"
import { getAddress, keccak256 } from "viem"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
import { ACCEPT_MLA_MESSAGE } from "@/config/mla-acceptance"
import { TargetChainId } from "@/config/network"
import { formatBps } from "@/utils/formatters"

type NetworkData = {
  chainId?: number
  name?: string
}

export type BasicBorrowerInfo = {
  address: string
} & Partial<Omit<BorrowerProfile, "registeredOnChain" | "chainId" | "address">>

export const DepositAccessString = {
  [DepositAccess.Open]: "Open",
  [DepositAccess.RequiresCredential]: "Restricted",
}

export const TransferAccessString = {
  [TransferAccess.Open]: "Open",
  [TransferAccess.RequiresCredential]: "Restricted",
  [TransferAccess.Disabled]: "Disabled",
}

export const WithdrawalAccessString = {
  [WithdrawalAccess.Open]: "Open",
  [WithdrawalAccess.RequiresCredential]: "Restricted",
}

export type MlaBorrowerFields = {
  lastSlaUpdateTime: number
  networkData: NetworkData
  market: {
    address: string
    name: string
    symbol: string
    marketType: HooksKind
    depositAccess: DepositAccess
    transferAccess: TransferAccess
    withdrawalAccess: WithdrawalAccess
    capacity: TokenAmount
    minimumDeposit: TokenAmount | undefined
    delinquencyGracePeriod: number
    withdrawalBatchDuration: number
    fixedTermEndTime: number | undefined
    /** APR in bips (format as %) */
    apr: number
    /** Delinquency fee in bips (format as %) */
    delinquencyFee: number
    /** Reserve ratio in bips (format as %) */
    reserveRatio: number
    // boolean (format as Yes, No, N/A)
    allowClosureBeforeTerm: boolean | undefined
    allowTermReduction: boolean | undefined
    allowForceBuyBack: boolean | undefined
  }
  borrowerInfo: BasicBorrowerInfo
  // address (format as checksum address)
  asset: Token
  // Date
  timeSigned: number
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

export const formatBool = (value: boolean | undefined): string | undefined => {
  if (value === undefined) return undefined
  return value ? "Yes" : "No"
}

const formatString = (value: string | undefined): string | undefined =>
  value ?? undefined

export const formatAddress = (value: string | undefined): string | undefined =>
  value ? getAddress(value) : undefined

const formatNumber = (value: number | undefined): string | undefined =>
  value ? value.toString() : undefined

export const formatBips = (value: number | undefined): string | undefined =>
  typeof value === "number" ? `${formatBps(value)}%` : undefined

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

export const formatDate = (value: number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return dayjs(toUnixMs(value)).format("MMMM DD, YYYY")
}

export const formatDuration = (
  value: number | undefined,
): string | undefined => {
  if (value === undefined) return undefined
  return humanizeDuration(1000 * value)
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

const getMarketParams = (market: Market): MlaBorrowerFields["market"] => {
  const { underlyingToken: asset, hooksConfig, name, symbol, address } = market
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
  return {
    address,
    name,
    symbol,
    marketType: hooksConfig?.kind ?? HooksKind.OpenTerm,
    depositAccess,
    transferAccess,
    withdrawalAccess,
    capacity: market.maxTotalSupply,
    minimumDeposit: hooksConfig?.minimumDeposit,
    delinquencyGracePeriod: market.delinquencyGracePeriod,
    withdrawalBatchDuration: market.withdrawalBatchDuration,
    fixedTermEndTime:
      hooksConfig?.kind === HooksKind.FixedTerm
        ? hooksConfig.fixedTermEndTime
        : undefined,
    apr: market.annualInterestBips,
    delinquencyFee: market.delinquencyFeeBips,
    reserveRatio: market.reserveRatioBips,
    allowClosureBeforeTerm:
      hooksConfig?.kind === HooksKind.FixedTerm
        ? hooksConfig.allowClosureBeforeTerm
        : undefined,
    allowTermReduction:
      hooksConfig?.kind === HooksKind.FixedTerm
        ? hooksConfig.allowTermReduction
        : undefined,
    allowForceBuyBack: hooksConfig?.allowForceBuyBacks,
  }
}

export function getFieldValuesForBorrower({
  market: marketInput,
  borrowerInfo,
  networkData,
  asset,
  timeSigned,
  lastSlaUpdateTime,
}: Omit<MlaBorrowerFields, "market"> & {
  market: MlaBorrowerFields["market"] | Market
}) {
  const market =
    marketInput instanceof Market ? getMarketParams(marketInput) : marketInput
  // console.log(`Min Deposit: ${hooksConfig?.minimumDeposit}`)

  const { jurisdiction, entityKind } = borrowerInfo

  const jurisdictionObj =
    jurisdiction !== undefined
      ? Jurisdictions[jurisdiction as keyof typeof Jurisdictions]
      : undefined
  const jurisdictionText =
    jurisdictionObj?.subDivisionName || jurisdictionObj?.countryName

  const entityKindText =
    entityKind !== undefined && jurisdictionObj
      ? ELFsByCountry[
          jurisdictionObj.countryCode as keyof typeof ELFsByCountry
        ].find((elf) => elf.elfCode === entityKind)?.name
      : undefined

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
        market.marketType === HooksKind.FixedTerm ? "Fixed Term" : "Open Term",
      ),
    ],
    ["market.name", formatString(market.name)],
    ["market.symbol", formatString(market.symbol)],
    ["borrower.name", formatString(borrowerInfo.name)],
    ["borrower.jurisdiction", formatString(jurisdictionText)],
    ["borrower.physicalAddress", formatString(borrowerInfo.physicalAddress)],
    ["borrower.entityKind", formatString(entityKindText)],
    // address (format as checksum address)
    [
      "market.depositAccess",
      formatString(DepositAccessString[market.depositAccess]),
    ],
    [
      "market.transferAccess",
      formatString(TransferAccessString[market.transferAccess]),
    ],
    [
      "market.withdrawalAccess",
      formatString(WithdrawalAccessString[market.withdrawalAccess]),
    ],
    /// On Sepolia, we deploy new assets on the fly, so we need to use the name of the asset
    /// instead of the address.
    [
      "asset.address",
      TargetChainId === 1 ? formatAddress(asset?.address) : asset?.name,
    ],
    ["market.address", formatAddress(market.address)],
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
    [
      "market.capacity",
      formatTokenAmount(asset.getAmount(market.capacity.raw)),
    ],
    [
      "market.minimumDeposit",
      market.minimumDeposit?.gt(0)
        ? formatTokenAmount(asset.getAmount(market.minimumDeposit.raw))
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
      market.marketType === HooksKind.FixedTerm
        ? formatDate(market.fixedTermEndTime)
        : "N/A",
    ],
    ["borrower.timeSigned", formatDate(timeSigned)],
    // ["lender.timeSigned", formatDate(Date.now())],
    ["sla.timeUpdated", formatDate(lastSlaUpdateTime)],
    // bips (format as %)
    ["market.apr", formatBips(market.apr)],
    ["market.delinquencyFee", formatBips(market.delinquencyFee)],
    ["market.reserveRatio", formatBips(market.reserveRatio)],
    // boolean (format as Yes, No, N/A)
    [
      "market.allowClosureBeforeTerm",
      market.marketType === HooksKind.FixedTerm
        ? formatBool(market.allowClosureBeforeTerm)
        : "N/A",
    ],
    [
      "market.allowTermReduction",
      market.marketType === HooksKind.FixedTerm
        ? formatBool(market.allowTermReduction)
        : "N/A",
    ],
    ["market.allowForceBuyBack", formatBool(market.allowForceBuyBack) ?? "N/A"],
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
  const utcDate = date.getUTCDate()
  const data: Map<LenderKeys, string | undefined> = new Map([
    ["lender.timeSigned", formatDate(lenderTimeSigned)],
    ["lender.timeSignedDayOrdinal", `${utcDate}${nth(utcDate)}`],
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
    const value = fieldValues.get(field.source) // ?? field.placeholder
    if (value === undefined) {
      return
    }
    plaintext = plaintext.replaceAll(`{{${field.source}}}`, value)
    html = html.replaceAll(`{{${field.source}}}`, value)
  })
  const marketAddress = fieldValues.get("market.address")
  if (!marketAddress) {
    throw new Error("Market address is required")
  }
  const message = ACCEPT_MLA_MESSAGE.replace(
    "{{market}}",
    formatAddress(marketAddress) as string,
  ).replace("{{hash}}", keccak256(toUtf8Bytes(plaintext)))
  return {
    html,
    plaintext,
    message,
  }
}

export function fillInMlaForLender(
  mla: BorrowerSignedMla,
  values: Map<MlaFieldValueKey, string | undefined>,
  marketAddress: string,
) {
  let { html, plaintext } = mla
  mla.lenderFields.forEach((field) => {
    const value = values.get(field.source) ?? field.placeholder
    plaintext = plaintext.replaceAll(`{{${field.source}}}`, value)
    html = html.replaceAll(`{{${field.source}}}`, value)
  })
  const message = ACCEPT_MLA_MESSAGE.replace(
    "{{market}}",
    formatAddress(marketAddress) as string,
  ).replace("{{hash}}", keccak256(toUtf8Bytes(plaintext)))

  return { html, plaintext, message }
}
