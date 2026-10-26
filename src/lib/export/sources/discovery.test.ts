/** @jest-environment node */

import { Deployments } from "@wildcatfi/wildcat-sdk"
import { utils } from "ethers"

import { discoverMarketUniverse, orderedMarketMetadata } from "./discovery"
import { ExportRpc } from "./rpc"
import { archControllerInterface, erc20Interface } from "../abi/registry"
import { MarketMetadata } from "../types"

const MARKET = "0x1111111111111111111111111111111111111111"
const BORROWER = "0x2222222222222222222222222222222222222222"
const FEE_RECIPIENT = "0x3333333333333333333333333333333333333333"
const ASSET = "0x4444444444444444444444444444444444444444"
const SNAPSHOT = 123_456
const metadata = new utils.Interface([
  "function version() view returns (string)",
  "function borrower() view returns (address)",
  "function feeRecipient() view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function asset() view returns (address)",
])
const readMetadata = async (method: string, params: unknown[]) => {
  expect(method).toBe("eth_call")
  const [{ to, data }] = params as [{ to: string; data: string }]
  const target = to.toLowerCase()
  const iface = target === ASSET ? erc20Interface : metadata
  const fragment = iface.getFunction(data.slice(0, 10))
  const values: Record<string, unknown[]> = {
    version: ["2"],
    borrower: [BORROWER],
    feeRecipient: [FEE_RECIPIENT],
    name: [target === ASSET ? "USD Coin" : "Test Market"],
    symbol: [target === ASSET ? "USDC" : "wmUSDC"],
    asset: [ASSET],
    decimals: [6],
  }
  return iface.encodeFunctionResult(fragment, values[fragment.name])
}
const registered = async () => [
  archControllerInterface.encodeFunctionResult("isRegisteredMarket", [true]),
]

describe("market discovery", () => {
  it("validates an explicit market directly without scanning registry logs", async () => {
    const getLogs = jest.fn(() => {
      throw new Error("Explicit market selection must not scan registry logs")
    })
    const call = jest.fn(readMetadata)
    const batch = jest.fn(async (_calls: unknown[]) => registered())
    const rpc = {
      usedProviderHosts: new Set<string>(),
      call,
      batch,
      getLogs,
      findDeploymentBlock: jest.fn(async () => 100),
    } as unknown as ExportRpc

    const universe = await discoverMarketUniverse(rpc, 1, SNAPSHOT, [MARKET])

    expect(Deployments[1]?.WildcatArchController).toBeTruthy()
    expect(batch).toHaveBeenCalledTimes(1)
    expect(batch.mock.calls[0][0]).toEqual([
      {
        method: "eth_call",
        params: [
          {
            to: Deployments[1]!.WildcatArchController!.toLowerCase(),
            data: archControllerInterface.encodeFunctionData(
              "isRegisteredMarket",
              [MARKET],
            ),
          },
          `0x${SNAPSHOT.toString(16)}`,
        ],
      },
    ])
    expect(getLogs).not.toHaveBeenCalled()
    expect(universe).toEqual({
      markets: [
        expect.objectContaining({
          address: MARKET,
          assetAddress: ASSET,
          borrower: BORROWER,
          deploymentBlock: 100,
          version: "2",
        }),
      ],
      excludedV1: [],
      marketAddedLayout: "none",
    })
  })

  it("uses a known deployment block without searching and returns the same metadata", async () => {
    const rpc = (findDeploymentBlock: () => Promise<number>) =>
      ({
        usedProviderHosts: new Set<string>(),
        call: readMetadata,
        batch: registered,
        getLogs: jest.fn(),
        findDeploymentBlock: jest.fn(findDeploymentBlock),
      }) as unknown as ExportRpc
    const searched = await discoverMarketUniverse(
      rpc(async () => 100),
      1,
      SNAPSHOT,
      [MARKET],
    )
    const searching = rpc(async () => {
      throw new Error("known deployment blocks must not be searched")
    })
    const known = await discoverMarketUniverse(
      searching,
      1,
      SNAPSHOT,
      [MARKET],
      new Map([[MARKET, 100]]),
    )

    expect(searching.findDeploymentBlock).not.toHaveBeenCalled()
    // Datasets embed this object, so its key order matters as well.
    expect(JSON.stringify(known)).toBe(JSON.stringify(searched))

    // A JSONB copy comes back with its keys reordered.
    const [market] = searched.markets
    const reordered = Object.fromEntries(
      Object.entries(market).reverse(),
    ) as MarketMetadata
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(market))
    expect(JSON.stringify(orderedMarketMetadata(reordered))).toBe(
      JSON.stringify(market),
    )
  })

  it("uses registry history for an explicit market removed before the snapshot", async () => {
    const getLogs = jest.fn(async () => {
      throw new Error("historical registry discovery reached")
    })
    const batch = jest.fn(async () => [
      archControllerInterface.encodeFunctionResult("isRegisteredMarket", [
        false,
      ]),
    ])
    const rpc = {
      usedProviderHosts: new Set<string>(),
      batch,
      getLogs,
      findDeploymentBlock: jest.fn(async () => 100),
    } as unknown as ExportRpc

    await expect(
      discoverMarketUniverse(rpc, 1, SNAPSHOT, [MARKET]),
    ).rejects.toThrow("historical registry discovery reached")
    expect(batch).toHaveBeenCalledTimes(1)
    expect(getLogs).toHaveBeenCalled()
  })
})
