/** @jest-environment node */

import { utils } from "ethers"

import { discoverV2Markets } from "./universe"
import { metadataInterface } from "../../export/abi/registry"
import { discoverMarketUniverse } from "../../export/sources/discovery"
import { ExportRpc } from "../../export/sources/rpc"

jest.mock("../../export/sources/discovery", () => ({
  discoverMarketUniverse: jest.fn(
    async (_rpc: unknown, _chainId: number, _block: number, selection) => ({
      markets: selection.map((address: string) => ({ address })),
      excludedV1: [],
      marketAddedLayout: "none",
    }),
  ),
}))

const registry = new utils.Interface([
  "function getRegisteredMarkets(uint256 start, uint256 end) view returns (address[])",
])
const market = (digit: string) => `0x${digit.repeat(40)}`
const [A, B, C, D, V1] = ["a", "b", "c", "d", "e"].map(market)

const rpc = {
  call: async () =>
    registry.encodeFunctionResult("getRegisteredMarkets", [[A, V1, B, C, D]]),
  batch: async (calls: { params: [{ to: string }] }[]) =>
    calls.map(({ params: [{ to }] }) =>
      metadataInterface.encodeFunctionResult("version", [
        to === V1 ? "1" : "2",
      ]),
    ),
} as unknown as ExportRpc

describe("V2 market discovery", () => {
  it("admits at most maxNew new markets per call, oldest registration first", async () => {
    const known = new Map([[A, 100]])
    const { markets, deferred } = await discoverV2Markets(rpc, 1, 1_000, {
      known,
      maxNew: 2,
    })

    expect(markets.map((entry) => entry.address)).toEqual([A, B, C])
    expect(deferred).toBe(1)
    expect(discoverMarketUniverse).toHaveBeenCalledWith(
      rpc,
      1,
      1_000,
      [A, B, C],
      known,
    )
  })

  it("skips known markets whose metadata is already stored", async () => {
    jest.mocked(discoverMarketUniverse).mockClear()
    const { markets, deferred } = await discoverV2Markets(rpc, 1, 1_000, {
      known: new Map([
        [A, 100],
        [B, 200],
      ]),
      stored: new Set([A, B]),
    })

    expect(markets.map((entry) => entry.address)).toEqual([C, D])
    expect(deferred).toBe(0)
    expect(jest.mocked(discoverMarketUniverse).mock.calls[0][3]).toEqual([C, D])
  })
})
