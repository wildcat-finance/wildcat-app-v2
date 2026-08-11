import { gunzipSync, gzipSync } from "node:zlib"

import { MarketDataset } from "../types"

const eventBigintFields = ["amountRaw", "scaledAmountRaw"] as const
const transactionBigintFields = [
  "depositedRaw",
  "borrowedRaw",
  "repaidRaw",
  "withdrawalQueuedRaw",
  "withdrawalExecutedRaw",
  "feesCollectedRaw",
  "escrowedOutRaw",
  "untrackedAssetInRaw",
  "untrackedAssetOutRaw",
  "marketTokensTransferredRaw",
  "gasUsed",
  "gasPriceWei",
] as const
const accrualBigintFields = [
  "baseInterestRay",
  "delinquencyFeeRay",
  "protocolFeesRaw",
  "scaleFactorBeforeRay",
  "scaleFactorAfterRay",
  "baseInterestAssetsRaw",
  "penaltyInterestAssetsRaw",
  "scaledTotalSupplyRaw",
] as const
const positionBigintFields = [
  "depositsRaw",
  "principalAcquiredByTransferRaw",
  "activePrincipalRaw",
  "pendingWithdrawalPrincipalRaw",
  "principalStillInvestedRaw",
  "principalReturnedRaw",
  "principalTransferredOutRaw",
  "marketTokensTransferredOutRaw",
  "currentValueRaw",
  "pendingWithdrawalValueRaw",
  "totalPositionValueRaw",
  "payoutsRaw",
  "earningsRaw",
  "scaledBalanceRaw",
] as const

export const MAX_DATASET_JSON_BYTES = 64 * 1_024 * 1_024

const reviveFields = <T extends Record<string, unknown>>(
  value: T,
  fields: readonly string[],
) => {
  const record = value as Record<string, unknown>
  fields.forEach((field) => {
    const item = record[field]
    if (typeof item === "string" && /^-?\d+$/.test(item)) {
      record[field] = BigInt(item)
    }
  })
  return value
}

export function serializeDataset(dataset: MarketDataset): Buffer {
  const json = JSON.stringify(dataset, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  )
  if (Buffer.byteLength(json) > MAX_DATASET_JSON_BYTES) {
    throw new Error("Market dataset exceeds the 64 MB uncompressed limit")
  }
  const compressed = gzipSync(Buffer.from(json), { level: 9 })
  compressed.writeUInt32LE(0, 4)
  compressed[9] = 255
  return compressed
}

export function deserializeDatasetWithSize(
  value: Buffer,
  maxOutputLength = MAX_DATASET_JSON_BYTES,
) {
  const json = gunzipSync(value, { maxOutputLength })
  const dataset = JSON.parse(json.toString("utf8")) as MarketDataset
  dataset.events.forEach((row) => reviveFields(row, eventBigintFields))
  dataset.transactions.forEach((row) =>
    reviveFields(row, transactionBigintFields),
  )
  dataset.interestAccruals.forEach((row) =>
    reviveFields(row, accrualBigintFields),
  )
  Object.values(dataset.positions).forEach((position) => {
    reviveFields(position, positionBigintFields)
    position.annualEarnings = Object.fromEntries(
      Object.entries(position.annualEarnings).map(([year, amount]) => [
        year,
        BigInt(amount),
      ]),
    )
  })
  dataset.manifest.delinquencyEpisodes.forEach((episode) => {
    episode.penaltyInterestAssetsRaw = BigInt(episode.penaltyInterestAssetsRaw)
  })
  return { dataset, jsonByteLength: json.byteLength }
}

export function deserializeDataset(value: Buffer): MarketDataset {
  return deserializeDatasetWithSize(value).dataset
}
