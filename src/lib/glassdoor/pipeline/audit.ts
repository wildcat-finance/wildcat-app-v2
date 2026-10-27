import { PrismaClient } from "@prisma/client"

import { isCurrentDatasetKey, loadAnalyticsDataset } from "./datasets"
import { buildMarketDataset } from "../../export/ledger/buildMarketDataset"
import { serializeDataset } from "../../export/serialize/dataset"
import { discoverMarketUniverse } from "../../export/sources/discovery"
import { ExportRpcClient } from "../../export/sources/rpc"
import { ExportChainId } from "../../export/types"

// Nightly second opinion. A stored analytics dataset was built incrementally
// from shared scans; the audit rebuilds the same market from scratch the way
// a user export does (its own log scan, Etherscan transfers and the Etherscan
// log comparison) at the same block and requires identical bytes.
//
// A mismatch puts the market under review until a later audit of it passes.
// Updates keep that flag while they go on rebuilding the market, and every
// flagged market is audited again each night.

export const GLASS_DOOR_AUDIT_SAMPLE = 3
export const AUDIT_REASON_PREFIX = "Audit:"

type ReviewState = { state: string; stateReason: string | null }

/** Under review because an audit found a difference, not a failed build. */
export const isAuditFlag = (status: ReviewState) =>
  status.state === "UnderReview" &&
  Boolean(status.stateReason?.startsWith(AUDIT_REASON_PREFIX))

/**
 * Markets to audit today: every market an audit flagged, then a rotating
 * slice of every market with a dataset.
 */
export async function pickAuditMarkets(
  database: PrismaClient,
  sample = GLASS_DOOR_AUDIT_SAMPLE,
  now = Date.now(),
) {
  const markets = await database.glassDoorMarketStatus
    .findMany({
      where: { datasetKey: { not: null } },
      orderBy: [{ chainId: "asc" }, { address: "asc" }],
      select: {
        chainId: true,
        address: true,
        state: true,
        stateReason: true,
        datasetKey: true,
      },
    })
    .then((rows) =>
      // A dataset from an earlier pipeline version waits for its rebuild.
      rows.filter(
        (row) => row.datasetKey && isCurrentDatasetKey(row.datasetKey),
      ),
    )
  if (markets.length === 0) return []
  const day = Math.floor(now / 86_400_000)
  const flagged = markets.filter(isAuditFlag)
  const rotating = Array.from(
    { length: Math.min(sample, markets.length) },
    (_, index) => markets[(day * sample + index) % markets.length],
  ).filter((market) => !flagged.includes(market))
  return [...flagged, ...rotating].map(({ chainId, address }) => ({
    chainId,
    address,
  }))
}

export async function auditMarket(
  database: PrismaClient,
  chainId: number,
  address: string,
) {
  const status = await database.glassDoorMarketStatus.findUniqueOrThrow({
    where: { chainId_address: { chainId, address } },
  })
  if (!status.datasetKey || !isCurrentDatasetKey(status.datasetKey)) {
    return { chainId, address, audited: false }
  }
  const stored = await loadAnalyticsDataset(status.datasetKey)
  const rpc = new ExportRpcClient(chainId as ExportChainId)
  const { markets } = await discoverMarketUniverse(
    rpc,
    chainId as ExportChainId,
    stored.snapshotBlock,
    [address],
  )
  const rebuilt = await buildMarketDataset(
    rpc,
    markets[0],
    stored.snapshotBlock,
    stored.snapshotBlockHash,
    stored.snapshotTimestamp,
    [],
  )
  const identical = serializeDataset(rebuilt).equals(serializeDataset(stored))
  if (!identical) {
    await database.glassDoorMarketStatus.update({
      where: { chainId_address: { chainId, address } },
      data: {
        state: "UnderReview",
        stateReason: `${AUDIT_REASON_PREFIX} a full rebuild at block ${stored.snapshotBlock} differs from the stored dataset`,
      },
    })
  } else if (isAuditFlag(status)) {
    await database.glassDoorMarketStatus.updateMany({
      where: {
        chainId,
        address,
        state: "UnderReview",
        stateReason: { startsWith: AUDIT_REASON_PREFIX },
      },
      data: { state: "Ok", stateReason: null },
    })
  }
  return {
    chainId,
    address,
    audited: true,
    block: stored.snapshotBlock,
    identical,
  }
}
