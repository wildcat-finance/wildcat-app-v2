/* eslint-disable no-await-in-loop */

import { createHash } from "node:crypto"

import { ExportArtifactKind, ExportJobStatus } from "@prisma/client"
import { FatalError } from "workflow"

import { prisma } from "@/lib/db"

import { ProviderThrottleError } from "./providerThrottle"
import {
  exportObjectExists,
  getExportObject,
  putExportObject,
  removeExportObjects,
} from "./storage"
import { buildExportBundle } from "../bundle"
import { getExportStorageNamespace } from "../config"
import {
  buildMarketDataset,
  buildPositionSummaries,
  MarketDatasetBuildStage,
} from "../ledger/buildMarketDataset"
import {
  assertExportWithinLimits,
  MAX_EXPORT_DATASET_BYTES,
  MAX_EXPORT_PART_BYTES,
} from "../limits"
import {
  deserializeDataset,
  deserializeDatasetWithSize,
  serializeDataset,
} from "../serialize/dataset"
import { discoverMarketUniverse } from "../sources/discovery"
import { ExportRpcClient } from "../sources/rpc"
import { CanonicalExportRequest, MarketDataset, MarketMetadata } from "../types"
import { EXPORT_PIPELINE_VERSION } from "../version"

const partKey = (request: CanonicalExportRequest, market: string) =>
  `${getExportStorageNamespace()}/parts/v${EXPORT_PIPELINE_VERSION}/${
    request.chainId
  }/${request.snapshotBlock}/${request.snapshotBlockHash.slice(
    2,
  )}/${market}.json.gz`
const bundleKey = (
  jobId: string,
  request: CanonicalExportRequest,
  datasets: MarketDataset[],
) => {
  const market =
    datasets.length === 1
      ? datasets[0].market.symbol.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()
      : "all"
  return `${getExportStorageNamespace()}/bundles/${jobId}/wildcat-full-${market}-${
    request.snapshotBlock
  }.zip`
}

const checksum = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex")

const marketStageFraction: Record<MarketDatasetBuildStage, number> = {
  reading_history: 0,
  building_transactions: 0.3,
  building_daily_history: 0.58,
  checking_balances: 0.82,
  finalizing_market_data: 0.95,
}

const marketStageEndFraction: Record<MarketDatasetBuildStage, number> = {
  reading_history: marketStageFraction.building_transactions,
  building_transactions: marketStageFraction.building_daily_history,
  building_daily_history: marketStageFraction.checking_balances,
  checking_balances: marketStageFraction.finalizing_market_data,
  finalizing_market_data: 1,
}

const marketProgress = (
  stage: MarketDatasetBuildStage,
  index: number,
  total: number,
  stageProgress = 0,
) =>
  5 +
  Math.floor(
    ((index +
      marketStageFraction[stage] +
      (marketStageEndFraction[stage] - marketStageFraction[stage]) *
        stageProgress) /
      Math.max(total, 1)) *
      75,
  )

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  action: (value: T) => Promise<void>,
) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor
        cursor += 1
        await action(values[index])
      }
    }),
  )
}

const validateDataset = (
  dataset: MarketDataset,
  request: CanonicalExportRequest,
  market: string,
) => {
  if (
    dataset.pipelineVersion !== EXPORT_PIPELINE_VERSION ||
    dataset.market.chainId !== request.chainId ||
    dataset.market.address.toLowerCase() !== market.toLowerCase() ||
    dataset.snapshotBlock !== Number(request.snapshotBlock) ||
    dataset.snapshotBlockHash.toLowerCase() !==
      request.snapshotBlockHash.toLowerCase()
  ) {
    throw new FatalError(`Cached export part has the wrong identity: ${market}`)
  }
}

async function recordArtifact(
  key: string,
  kind: ExportArtifactKind,
  value: Buffer,
  jobId?: string,
) {
  const digest = checksum(value)
  const existing = await prisma.exportArtifact.findUnique({ where: { key } })
  if (
    existing &&
    (existing.checksum !== digest ||
      existing.byteLength !== value.byteLength ||
      existing.pipelineVersion !== EXPORT_PIPELINE_VERSION ||
      existing.environment !== getExportStorageNamespace())
  ) {
    throw new FatalError(`Cached export object failed integrity checks: ${key}`)
  }
  await prisma.exportArtifact.upsert({
    where: { key },
    create: {
      key,
      kind,
      jobId,
      checksum: digest,
      byteLength: value.byteLength,
      pipelineVersion: EXPORT_PIPELINE_VERSION,
      environment: getExportStorageNamespace(),
    },
    update: {
      lastAccessedAt: new Date(),
      ...(jobId ? { jobId } : {}),
    },
  })
  const recorded = await prisma.exportArtifact.findUniqueOrThrow({
    where: { key },
  })
  if (
    recorded.checksum !== digest ||
    recorded.byteLength !== value.byteLength ||
    recorded.pipelineVersion !== EXPORT_PIPELINE_VERSION ||
    recorded.environment !== getExportStorageNamespace()
  ) {
    throw new FatalError(`Cached export object failed integrity checks: ${key}`)
  }
}

async function updateActiveJob(
  jobId: string,
  data: Parameters<typeof prisma.exportJob.updateMany>[0]["data"],
) {
  const updated = await prisma.exportJob.updateMany({
    where: {
      id: jobId,
      status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
    },
    data: { ...data, heartbeatAt: new Date() },
  })
  if (updated.count === 0) throw new FatalError(`Export job ${jobId} stopped`)
}

const deterministicError = (error: unknown) => {
  if (error instanceof FatalError) return error
  if (error instanceof ProviderThrottleError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (
    /HTTP \d+|timed? ?out|fetch failed|every configured provider|Failed to (upload|download|inspect)|Etherscan request failed/i.test(
      message,
    )
  ) {
    return error
  }
  return new FatalError(message)
}

async function loadJob(jobId: string) {
  "use step"

  const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
  if (!job) throw new FatalError(`Export job ${jobId} does not exist`)
  if (job.status === ExportJobStatus.Cancelled) {
    throw new FatalError(`Export job ${jobId} was cancelled`)
  }
  return {
    request: job.params as CanonicalExportRequest,
    generatedAtUtc: job.createdAt.toISOString(),
  }
}

async function markRunning(jobId: string) {
  "use step"

  await updateActiveJob(jobId, {
    status: ExportJobStatus.Running,
    progress: 1,
    phase: "discovering_markets",
  })
}

async function resolveMarkets(request: CanonicalExportRequest) {
  "use step"

  try {
    const rpc = new ExportRpcClient(request.chainId)
    const universe = await discoverMarketUniverse(
      rpc,
      request.chainId,
      Number(request.snapshotBlock),
      request.markets,
    )
    assertExportWithinLimits(request, universe.markets.length)
    return universe
  } catch (error) {
    throw deterministicError(error)
  }
}

async function buildPart(
  jobId: string,
  request: CanonicalExportRequest,
  market: MarketMetadata,
  index: number,
  total: number,
) {
  "use step"

  const key = partKey(request, market.address)
  try {
    const reportProgress = async (
      stage: MarketDatasetBuildStage,
      stageProgress = 0,
    ) => {
      await updateActiveJob(jobId, {
        progress: marketProgress(stage, index, total, stageProgress),
        phase: `${stage}_${index + 1}_of_${total}`,
      })
    }
    let part: Buffer | undefined
    let cacheExists = await exportObjectExists(key)
    if (cacheExists) {
      const artifact = await prisma.exportArtifact.findUnique({
        where: { key },
      })
      if (!artifact) {
        await removeExportObjects([key])
        cacheExists = false
      }
    }
    if (cacheExists) {
      await updateActiveJob(jobId, {
        progress: marketProgress("finalizing_market_data", index, total),
        phase: `loading_cached_market_data_${index + 1}_of_${total}`,
      })
      part = await getExportObject(key)
      validateDataset(deserializeDataset(part), request, market.address)
      await recordArtifact(key, ExportArtifactKind.Part, part)
    } else {
      const rpc = new ExportRpcClient(request.chainId)
      const snapshot = await rpc.getBlock(Number(request.snapshotBlock))
      const dataset = await buildMarketDataset(
        rpc,
        market,
        Number(request.snapshotBlock),
        request.snapshotBlockHash,
        Number.parseInt(snapshot.timestamp, 16),
        [],
        undefined,
        reportProgress,
      )
      part = serializeDataset(dataset)
      await recordArtifact(key, ExportArtifactKind.Part, part)
      try {
        await putExportObject(key, part, "application/gzip")
      } catch (error) {
        if (!(await exportObjectExists(key))) throw error
        part = await getExportObject(key)
        validateDataset(deserializeDataset(part), request, market.address)
        await recordArtifact(key, ExportArtifactKind.Part, part)
      }
    }
  } catch (error) {
    throw deterministicError(error)
  }
  await updateActiveJob(jobId, {
    progress: 5 + Math.floor(((index + 1) / total) * 75),
    phase: `market_complete_${index + 1}_of_${total}`,
  })
  return key
}

async function assemble(
  jobId: string,
  request: CanonicalExportRequest,
  partKeys: string[],
  excludedV1: string[],
  generatedAtUtc: string,
) {
  "use step"

  await updateActiveJob(jobId, { progress: 82, phase: "loading_market_data" })
  const datasets: MarketDataset[] = []
  let compressedBytes = 0
  let datasetBytes = 0
  for (let index = 0; index < partKeys.length; index += 1) {
    const key = partKeys[index]
    const part = await getExportObject(key)
    compressedBytes += part.byteLength
    if (compressedBytes > MAX_EXPORT_PART_BYTES) {
      throw new FatalError(
        `Export source data exceeds the ${Math.floor(
          MAX_EXPORT_PART_BYTES / 1_024 / 1_024,
        )} MB assembly limit`,
      )
    }
    const decoded = deserializeDatasetWithSize(part)
    datasetBytes += decoded.jsonByteLength
    if (datasetBytes > MAX_EXPORT_DATASET_BYTES) {
      throw new FatalError("Export datasets exceed the 256 MB assembly limit")
    }
    const { dataset } = decoded
    validateDataset(dataset, request, dataset.market.address)
    datasets.push(dataset)
    await recordArtifact(key, ExportArtifactKind.Part, part)
  }
  if (request.statements.includes("position")) {
    await updateActiveJob(jobId, {
      progress: 85,
      phase: "building_position_data",
    })
    const rpc = new ExportRpcClient(request.chainId)
    await mapWithConcurrency(datasets, 3, async (dataset) => {
      dataset.positions = await buildPositionSummaries(
        rpc,
        dataset.market,
        dataset.snapshotBlock,
        dataset.snapshotTimestamp,
        dataset.events,
        request.addresses,
      )
    })
  }
  await updateActiveJob(jobId, { progress: 88, phase: "preparing_bundle" })
  const bundle = await buildExportBundle(
    request,
    datasets,
    excludedV1,
    generatedAtUtc,
    async (stage) => {
      await updateActiveJob(jobId, {
        progress: stage === "creating_statements" ? 90 : 94,
        phase: stage,
      })
    },
  )
  await updateActiveJob(jobId, { progress: 96, phase: "uploading_export" })
  const key = bundleKey(jobId, request, datasets)
  await recordArtifact(key, ExportArtifactKind.Bundle, bundle, jobId)
  try {
    await putExportObject(key, bundle, "application/zip")
  } catch (error) {
    if (!(await exportObjectExists(key))) throw error
    await recordArtifact(
      key,
      ExportArtifactKind.Bundle,
      await getExportObject(key),
      jobId,
    )
  }
  await updateActiveJob(jobId, { progress: 99, phase: "finalizing" })
  return { key, generatedAtUtc }
}

async function complete(
  jobId: string,
  artifactKey: string,
  generatedAtUtc: string,
) {
  "use step"

  await updateActiveJob(jobId, {
    status: ExportJobStatus.Completed,
    progress: 100,
    phase: "completed",
    artifactKey,
    generatedAtUtc: new Date(generatedAtUtc),
    completedAt: new Date(),
  })
}

async function fail(jobId: string, error: unknown) {
  "use step"

  const message = error instanceof Error ? error.message : String(error)
  await prisma.exportJob.updateMany({
    where: {
      id: jobId,
      status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
    },
    data: {
      status: ExportJobStatus.Failed,
      phase: "failed",
      errorClass: error instanceof Error ? error.name : "Error",
      error: message.slice(0, 4_000),
      completedAt: new Date(),
      heartbeatAt: new Date(),
    },
  })
}

export async function exportWorkflow(jobId: string) {
  "use workflow"

  try {
    const { request, generatedAtUtc } = await loadJob(jobId)
    await markRunning(jobId)
    const universe = await resolveMarkets(request)
    if (universe.markets.length === 0) {
      throw new FatalError("No supported V2 markets matched this export")
    }
    const keys: string[] = []
    for (let index = 0; index < universe.markets.length; index += 1) {
      keys.push(
        await buildPart(
          jobId,
          request,
          universe.markets[index],
          index,
          universe.markets.length,
        ),
      )
    }
    const artifact = await assemble(
      jobId,
      request,
      keys,
      universe.excludedV1,
      generatedAtUtc,
    )
    await complete(jobId, artifact.key, artifact.generatedAtUtc)
    return { artifactKey: artifact.key }
  } catch (error) {
    await fail(jobId, error)
    throw error
  }
}
/* eslint-disable no-await-in-loop */
