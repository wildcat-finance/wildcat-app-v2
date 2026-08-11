/* eslint-disable no-await-in-loop, no-restricted-syntax */

import { Deployments } from "@wildcatfi/wildcat-sdk"
import { utils } from "ethers"

import { ExportRpc, fromHex, toBlockHex } from "./rpc"
import { erc20Read, contractRead } from "./state"
import {
  archControllerInterface,
  CONTROLLER_ADDED_TOPIC,
  CONTROLLER_MARKET_DEPLOYED_TOPIC,
  decodeMarketAdded,
  erc20Interface,
  HOOKS_MARKET_DEPLOYED_TOPIC,
  hooksFactoryInterface,
  MARKET_ADDED_TOPIC,
  MARKET_REMOVED_TOPIC,
  marketControllerInterface,
} from "../abi/registry"
import { ExportChainId, MarketMetadata } from "../types"

const addressPattern = /^0x[0-9a-f]{40}$/

const normalizeAddress = (address: string) => {
  const normalized = address.toLowerCase()
  if (!addressPattern.test(normalized))
    throw new Error(`Invalid market address: ${address}`)
  return normalized
}

export type MarketUniverse = {
  markets: MarketMetadata[]
  excludedV1: string[]
  marketAddedLayout: "controller_indexed" | "unindexed" | "none"
}

async function readArchControllerMarkets(
  rpc: ExportRpc,
  archController: string,
  snapshotBlock: number,
) {
  const result: string[] = []
  let start = 0
  let hasMore = true
  const pageSize = 100
  const functionSignature = "getRegisteredMarkets(uint256,uint256)"
  while (hasMore) {
    const data = archControllerInterface.encodeFunctionData(functionSignature, [
      start,
      start + pageSize,
    ])
    const raw = await rpc.call<string>("eth_call", [
      { to: archController, data },
      toBlockHex(snapshotBlock),
    ])
    const page = archControllerInterface.decodeFunctionResult(
      functionSignature,
      raw,
    )[0] as string[]
    result.push(...page.map((address) => address.toLowerCase()))
    hasMore = page.length === pageSize
    start += page.length
  }
  return result
}

async function discoverMetadata(
  rpc: ExportRpc,
  chainId: ExportChainId,
  address: string,
  snapshotBlock: number,
  registryData?: { controller?: string; removedAtBlock?: number },
): Promise<MarketMetadata> {
  const [version, borrower, feeRecipient, name, symbol, assetAddress] =
    await Promise.all([
      contractRead<string>(rpc, address, "version", [], snapshotBlock),
      contractRead<string>(rpc, address, "borrower", [], snapshotBlock),
      contractRead<string>(rpc, address, "feeRecipient", [], snapshotBlock),
      contractRead<string>(rpc, address, "name", [], snapshotBlock),
      contractRead<string>(rpc, address, "symbol", [], snapshotBlock),
      contractRead<string>(rpc, address, "asset", [], snapshotBlock),
    ])
  const asset = String(assetAddress).toLowerCase()
  const [assetName, assetSymbol, assetDecimals, deploymentBlock] =
    await Promise.all([
      erc20Read<string>(rpc, erc20Interface, asset, "name", [], snapshotBlock),
      erc20Read<string>(
        rpc,
        erc20Interface,
        asset,
        "symbol",
        [],
        snapshotBlock,
      ),
      erc20Read<number>(
        rpc,
        erc20Interface,
        asset,
        "decimals",
        [],
        snapshotBlock,
      ),
      rpc.findDeploymentBlock(address, snapshotBlock),
    ])
  return {
    chainId,
    address,
    controller: registryData?.controller,
    removedAtBlock: registryData?.removedAtBlock,
    version: String(version),
    borrower: String(borrower).toLowerCase(),
    feeRecipient: String(feeRecipient).toLowerCase(),
    name: String(name),
    symbol: String(symbol),
    assetAddress: asset,
    assetName: String(assetName),
    assetSymbol: String(assetSymbol),
    assetDecimals: Number(assetDecimals),
    deploymentBlock,
  }
}

async function loadMarketMetadata(
  rpc: ExportRpc,
  chainId: ExportChainId,
  snapshotBlock: number,
  addresses: string[],
  registryData: Map<string, { controller?: string; removedAtBlock?: number }>,
  marketAddedLayout: MarketUniverse["marketAddedLayout"],
  allowV1Exclusion: boolean,
): Promise<MarketUniverse> {
  const metadata = await Promise.all(
    addresses.map((address) =>
      discoverMetadata(
        rpc,
        chainId,
        address,
        snapshotBlock,
        registryData.get(address),
      ),
    ),
  )
  const excludedV1 = metadata
    .filter((market) => /^1(?:\.0)?$/.test(market.version))
    .map((market) => market.address)
  const unknown = metadata.filter(
    (market) => !/^[12](?:\.0)?$/.test(market.version),
  )
  if (unknown.length > 0) {
    throw new Error(
      `Unsupported market versions: ${unknown
        .map((market) => `${market.address} (${market.version})`)
        .join(", ")}`,
    )
  }
  if (!allowV1Exclusion && excludedV1.length > 0) {
    throw new Error(`V1 markets are not supported: ${excludedV1.join(", ")}`)
  }
  return {
    markets: metadata.filter((market) => /^2(?:\.0)?$/.test(market.version)),
    excludedV1,
    marketAddedLayout,
  }
}

async function areCurrentlyRegistered(
  rpc: ExportRpc,
  archController: string,
  snapshotBlock: number,
  addresses: string[],
) {
  const responses = await rpc.batch<string>(
    addresses.map((address) => ({
      method: "eth_call",
      params: [
        {
          to: archController,
          data: archControllerInterface.encodeFunctionData(
            "isRegisteredMarket",
            [address],
          ),
        },
        toBlockHex(snapshotBlock),
      ],
    })),
  )
  return responses.every(
    (response) =>
      archControllerInterface.decodeFunctionResult(
        "isRegisteredMarket",
        response,
      )[0] === true,
  )
}

async function validateDeploymentSources(
  rpc: ExportRpc,
  hooksFactory: string | undefined,
  archController: string,
  archDeploymentBlock: number,
  snapshotBlock: number,
  replayUniverse: Set<string>,
) {
  const deployed = new Set<string>()
  if (hooksFactory) {
    const deploymentBlock = await rpc.findDeploymentBlock(
      hooksFactory,
      snapshotBlock,
    )
    const logs = await rpc.getLogs({
      address: hooksFactory,
      fromBlock: deploymentBlock,
      toBlock: snapshotBlock,
      topics: [HOOKS_MARKET_DEPLOYED_TOPIC],
    })
    logs.forEach((log) => {
      deployed.add(
        String(hooksFactoryInterface.parseLog(log).args.market).toLowerCase(),
      )
    })
  }
  const controllerLogs = await rpc.getLogs({
    address: archController,
    fromBlock: archDeploymentBlock,
    toBlock: snapshotBlock,
    topics: [CONTROLLER_ADDED_TOPIC],
  })
  const controllers = controllerLogs.map((log) => {
    if (log.topics.length > 1) {
      return utils.getAddress(`0x${log.data.slice(-40)}`).toLowerCase()
    }
    const decoded = archControllerInterface.parseLog(log)
    return String(decoded.args.controller).toLowerCase()
  })
  await Promise.all(
    [...new Set(controllers)].map(async (controller) => {
      const deploymentBlock = await rpc.findDeploymentBlock(
        controller,
        snapshotBlock,
      )
      const logs = await rpc.getLogs({
        address: controller,
        fromBlock: deploymentBlock,
        toBlock: snapshotBlock,
        topics: [CONTROLLER_MARKET_DEPLOYED_TOPIC],
      })
      logs.forEach((log) => {
        deployed.add(
          String(
            marketControllerInterface.parseLog(log).args.market,
          ).toLowerCase(),
        )
      })
    }),
  )
  const absent = [...deployed].filter((market) => !replayUniverse.has(market))
  if (absent.length > 0) {
    throw new Error(
      `Factory/controller deployment logs contain markets absent from MarketAdded replay: ${absent.join(
        ", ",
      )}`,
    )
  }
}

export async function discoverMarketUniverse(
  rpc: ExportRpc,
  chainId: ExportChainId,
  snapshotBlock: number,
  selection: "all" | string[],
): Promise<MarketUniverse> {
  const deployment = Deployments[chainId]
  const archController = deployment?.WildcatArchController?.toLowerCase()
  if (!archController)
    throw new Error(`No ArchController deployment for chain ${chainId}`)

  const selected =
    selection === "all"
      ? undefined
      : [...new Set(selection.map(normalizeAddress))].sort()
  if (
    selected &&
    (await areCurrentlyRegistered(rpc, archController, snapshotBlock, selected))
  ) {
    return loadMarketMetadata(
      rpc,
      chainId,
      snapshotBlock,
      selected,
      new Map(),
      "none",
      false,
    )
  }

  const archDeploymentBlock = await rpc.findDeploymentBlock(
    archController,
    snapshotBlock,
  )
  const [addedLogs, removedLogs] = await Promise.all([
    rpc.getLogs({
      address: archController,
      fromBlock: archDeploymentBlock,
      toBlock: snapshotBlock,
      topics: [MARKET_ADDED_TOPIC],
    }),
    rpc.getLogs({
      address: archController,
      fromBlock: archDeploymentBlock,
      toBlock: snapshotBlock,
      topics: [MARKET_REMOVED_TOPIC],
    }),
  ])

  const universe = new Map<
    string,
    { controller?: string; removedAtBlock?: number }
  >()
  let marketAddedLayout: MarketUniverse["marketAddedLayout"] = "none"
  for (const log of addedLogs) {
    const decoded = decodeMarketAdded(log)
    if (marketAddedLayout !== "none" && marketAddedLayout !== decoded.layout) {
      throw new Error(
        "ArchController MarketAdded layout changed within one deployment",
      )
    }
    marketAddedLayout = decoded.layout
    universe.set(decoded.market, { controller: decoded.controller })
  }

  for (const log of removedLogs) {
    let market: string
    try {
      market = String(
        archControllerInterface.parseLog(log).args.market,
      ).toLowerCase()
    } catch {
      market = utils.getAddress(`0x${log.data.slice(-40)}`).toLowerCase()
    }
    const existing = universe.get(market)
    if (existing) existing.removedAtBlock = fromHex(log.blockNumber)
  }

  const registered = await readArchControllerMarkets(
    rpc,
    archController,
    snapshotBlock,
  )
  const absent = registered.filter((address) => !universe.has(address))
  if (absent.length > 0) {
    throw new Error(
      `ArchController registry contains markets absent from MarketAdded replay: ${absent.join(
        ", ",
      )}`,
    )
  }
  await validateDeploymentSources(
    rpc,
    deployment?.HooksFactory?.toLowerCase(),
    archController,
    archDeploymentBlock,
    snapshotBlock,
    new Set(universe.keys()),
  )

  const requested =
    selection === "all" ? [...universe.keys()].sort() : selected!
  for (const address of requested) {
    if (!universe.has(address)) {
      throw new Error(
        `Requested address ${address} is not a registered Wildcat market`,
      )
    }
  }

  return loadMarketMetadata(
    rpc,
    chainId,
    snapshotBlock,
    requested,
    universe,
    marketAddedLayout,
    selection === "all",
  )
}

export async function resolveSnapshotBlock(rpc: ExportRpc, requested?: string) {
  const finalized = await rpc.getBlock("finalized")
  const finalizedNumber = fromHex(finalized.number)
  if (!requested) {
    return {
      blockNumber: finalizedNumber,
      blockHash: finalized.hash.toLowerCase(),
      timestamp: fromHex(finalized.timestamp),
    }
  }
  if (!/^\d+$/.test(requested))
    throw new Error("snapshotBlock must be an integer")
  const blockNumber = Number(requested)
  if (!Number.isSafeInteger(blockNumber) || blockNumber > finalizedNumber) {
    throw new Error(
      `snapshotBlock must be at or before finalized block ${finalizedNumber}`,
    )
  }
  const block = await rpc.getBlock(blockNumber)
  return {
    blockNumber,
    blockHash: block.hash.toLowerCase(),
    timestamp: fromHex(block.timestamp),
  }
}
