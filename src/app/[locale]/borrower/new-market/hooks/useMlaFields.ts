import { useMemo } from "react"

import {
  DepositAccess,
  TokenAmount,
  TransferAccess,
  getDeploymentAddress,
} from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import humanizeDuration from "humanize-duration"
import { checksumAddress, getAddress } from "viem"

import { TargetChainId } from "@/config/network"
import { formatBps } from "@/utils/formatters"

import { DeployNewV2MarketParams } from "./useDeployV2Market"

type BasicBorrowerInfo = {
  address: string
  name: string
  jurisdiction?: string
  physicalAddress?: string
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
  [DepositAccess.Open]: "Open",
  [DepositAccess.RequiresCredential]: "Restricted",
}

type NetworkData = {
  chainId?: number
  name?: string
}

type MlaFieldValueKey =
  // number
  | "network.chainId"
  // string
  | "network.name"
  | "asset.name"
  | "asset.symbol"
  | "market.marketType"
  | "market.name"
  | "market.symbol"
  | "borrower.name"
  | "borrower.jurisdiction"
  | "borrower.physicalAddress"
  // address (format as checksum address)
  | "market.depositAccess"
  | "market.transferAccess"
  | "market.withdrawalAccess"
  | "asset.address"
  | "market.address"
  | "borrower.address"
  | "lender.address"
  | "chainalysisOracle.address"
  | "hooksFactory.address"
  // token amount
  | "market.capacity"
  | "market.minimumDeposit"
  // duration
  | "market.delinquencyGracePeriod"
  | "market.withdrawalBatchDuration"
  // Date
  | "market.fixedTermEndTime"
  | "borrower.timeSigned"
  | "lender.timeSigned"
  | "sla.timeUpdated"
  // bips (format as %)
  | "market.annualInterestBips"
  | "market.delinquencyFeeBips"
  | "market.reserveRatioBips"
  // boolean (format as Yes, No, N/A)
  | "market.allowClosureBeforeTerm"
  | "market.allowTermReduction"
  | "market.allowForceBuyBack"

const formatBool = (value: boolean | undefined): string => {
  if (value === undefined) return "N/A"
  return value ? "Yes" : "No"
}

const formatString = (value: string | undefined): string => value ?? "N/A"

const formatAddress = (value: string | undefined): string =>
  value ? getAddress(value) : "N/A"

const formatNumber = (value: number | undefined): string =>
  value ? value.toString() : "N/A"

const formatBips = (value: number | undefined): string =>
  value ? `${formatBps(value)}%` : "N/A"

const toUnixMs = (value: number): number => {
  // If value is in seconds, convert to milliseconds
  // Works for any unix timestamp prior to the year 22970 (lol)
  if (new Date(value).getFullYear() === 1970) {
    value *= 1000
  }
  return value
}

const formatDate = (value: number | undefined): string => {
  if (value === undefined) return "N/A"
  return dayjs(toUnixMs(value)).format("MMMM DD, YYYY")
}

const formatDuration = (value: number | undefined): string => {
  if (value === undefined) return "N/A"
  return humanizeDuration(toUnixMs(value))
}

/// Derives the field values for the MLA version to be signed by a borrower.
export const useGetMlaFieldValuesForBorrower = (
  marketParams: DeployNewV2MarketParams,
  borrowerInfo: BasicBorrowerInfo,
  networkData: NetworkData,
  borrowerTimeSigned: number,
  lastSlaUpdateTime: number,
) => {
  const asset = marketParams.assetData
  const marketAddress = `0x${asset.address}` // @todo: calculate market address
  const marketName = `${marketParams.namePrefix}${asset.name}`
  const marketSymbol = `${marketParams.symbolPrefix}${asset.symbol}`
  const allData: Map<MlaFieldValueKey, string> = new Map([
    // number
    ["network.chainId", formatNumber(networkData.chainId)],
    // string
    ["network.name", formatString(networkData.name)],
    ["asset.name", formatString(asset.name)],
    ["asset.symbol", formatString(asset.symbol)],
    [
      "market.marketType",
      formatString(
        "fixedTermEndTime" in marketParams ? "Fixed Term" : "Open Term",
      ),
    ],
    ["market.name", formatString(marketName)],
    ["market.symbol", formatString(marketSymbol)],
    ["borrower.name", formatString(borrowerInfo.name)],
    ["borrower.jurisdiction", formatString(borrowerInfo.jurisdiction)],
    ["borrower.physicalAddress", formatString(borrowerInfo.physicalAddress)],
    // address (format as checksum address)
    [
      "market.depositAccess",
      formatString(DepositAccessString[marketParams.depositAccess]),
    ],
    [
      "market.transferAccess",
      formatString(TransferAccessString[marketParams.transferAccess]),
    ],
    [
      "market.withdrawalAccess",
      formatString(WithdrawalAccessString[marketParams.depositAccess]),
    ],
    ["asset.address", formatAddress(asset.address)],
    ["market.address", formatAddress(marketAddress)],
    ["borrower.address", formatAddress(borrowerInfo.address)],
    // ["lender.address", formatAddress(marketParams.lenderAddress)],
    [
      "chainalysisOracle.address" /* @todo should be Chainalysis */,
      formatAddress(getDeploymentAddress(TargetChainId, "MockChainalysis")),
    ],
    [
      "hooksFactory.address",
      formatAddress(getDeploymentAddress(TargetChainId, "HooksFactory")),
    ],
    // token amount
    [
      "market.capacity",
      `${formatNumber(marketParams.maxTotalSupply)} ${asset.symbol}`,
    ],
    [
      "market.minimumDeposit",
      `${formatNumber(marketParams.minimumDeposit)} ${asset.symbol}`,
    ],
    // duration
    [
      "market.delinquencyGracePeriod",
      formatDuration(marketParams.delinquencyGracePeriod),
    ],
    [
      "market.withdrawalBatchDuration",
      formatDuration(marketParams.withdrawalBatchDuration),
    ],
    // date
    [
      "market.fixedTermEndTime",
      formatDate(
        "fixedTermEndTime" in marketParams
          ? marketParams.fixedTermEndTime
          : undefined,
      ),
    ],
    ["borrower.timeSigned", formatDate(borrowerTimeSigned)],
    // ["lender.timeSigned", formatDate(Date.now())],
    ["sla.timeUpdated", formatDate(lastSlaUpdateTime)],
    // bips (format as %)
    ["market.annualInterestBips", formatBips(marketParams.annualInterestBips)],
    ["market.delinquencyFeeBips", formatBips(marketParams.delinquencyFeeBips)],
    ["market.reserveRatioBips", formatBips(marketParams.reserveRatioBips)],
    // boolean (format as Yes, No, N/A)
    [
      "market.allowClosureBeforeTerm",
      formatBool(
        "allowClosureBeforeTerm" in marketParams
          ? marketParams.allowClosureBeforeTerm
          : undefined,
      ),
    ],
    [
      "market.allowTermReduction",
      formatBool(
        "allowTermReduction" in marketParams
          ? marketParams.allowTermReduction
          : undefined,
      ),
    ],
    ["market.allowForceBuyBack", formatBool(marketParams.allowForceBuyBacks)],
  ])
  return allData
}

type MlaTemplateField = {
  source: MlaFieldValueKey // one of the available field names
  placeholder: string // text to replace
}

type MlaTemplate = {
  html: string
  plaintext: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}

/// Derives the MLA template to be signed by a borrower.
const useMlaForBorrower = (
  template: MlaTemplate,
  marketParams: DeployNewV2MarketParams,
  borrowerInfo: BasicBorrowerInfo,
  networkData: NetworkData,
  borrowerTimeSigned: number,
  lastSlaUpdateTime: number,
) => {
  const values = useGetMlaFieldValuesForBorrower(
    marketParams,
    borrowerInfo,
    networkData,
    borrowerTimeSigned,
    lastSlaUpdateTime,
  )

  const { html, plaintext } = useMemo(() => {
    let { html: newHtml, plaintext: newPlaintext } = template
    // for (const field of template.borrowerFields)

    template.borrowerFields.forEach((field) => {
      const value = values.get(field.source)
      if (value) {
        newHtml = newHtml.replaceAll(field.placeholder, value)
        newPlaintext = newPlaintext.replaceAll(field.placeholder, value)
      }
    })

    return { html: newHtml, plaintext: newPlaintext }
  }, [values, template])

  return { html: html.trim(), plaintext: plaintext.trim() }
}
