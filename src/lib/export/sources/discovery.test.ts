/** @jest-environment node */

import { Deployments } from "@wildcatfi/wildcat-sdk"
import { utils } from "ethers"

import { discoverMarketUniverse } from "./discovery"
import { ExportRpc } from "./rpc"
import { archControllerInterface, erc20Interface } from "../abi/registry"

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

describe("market discovery", () => {
  it("validates an explicit market directly without scanning registry logs", async () => {
    const getLogs = jest.fn(() => {
      throw new Error("Explicit market selection must not scan registry logs")
    })
    const call = jest.fn(async (method: string, params: unknown[]) => {
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
    })
    const batch = jest.fn(async () => [
      archControllerInterface.encodeFunctionResult("isRegisteredMarket", [
        true,
      ]),
    ])
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

  it("keeps full registry discovery for an all-markets request", async () => {
    const getLogs = jest.fn(async () => {
      throw new Error("full registry discovery reached")
    })
    const batch = jest.fn()
    const rpc = {
      usedProviderHosts: new Set<string>(),
      batch,
      getLogs,
      findDeploymentBlock: jest.fn(async () => 100),
    } as unknown as ExportRpc

    await expect(
      discoverMarketUniverse(rpc, 1, SNAPSHOT, "all"),
    ).rejects.toThrow("full registry discovery reached")
    expect(batch).not.toHaveBeenCalled()
    expect(getLogs).toHaveBeenCalled()
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
