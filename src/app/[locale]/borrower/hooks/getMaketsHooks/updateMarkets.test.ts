import {
  getLensContract,
  hasDeploymentAddress,
  Market,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import { updateMarkets } from "./updateMarkets"
import { refreshMarketsV2LiveDataSafe } from "../../../../../utils/marketV2Reads"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getLensContract: jest.fn(),
  hasDeploymentAddress: jest.fn(),
  logger: { debug: jest.fn() },
  MarketVersion: {
    V1: "V1",
    V2: "V2",
  },
}))

jest.mock("../../../../../utils/marketV2Reads", () => ({
  refreshMarketsV2LiveDataSafe: jest.fn(),
}))

jest.mock("@/config/network", () => ({
  NETWORKS: {
    Mainnet: { chainId: 1 },
  },
}))

const getLensContractMock = getLensContract as jest.MockedFunction<
  typeof getLensContract
>
const hasDeploymentAddressMock = hasDeploymentAddress as jest.MockedFunction<
  typeof hasDeploymentAddress
>
const refreshMarketsV2LiveDataSafeMock =
  refreshMarketsV2LiveDataSafe as jest.MockedFunction<
    typeof refreshMarketsV2LiveDataSafe
  >

const network = { chainId: 11155111 }
const provider = { request: jest.fn() }
const v2Market = {
  address: "0x0000000000000000000000000000000000000001",
  version: MarketVersion.V2,
  underlyingToken: {
    address: "0x0000000000000000000000000000000000000002",
  },
} as Market

describe("updateMarkets live-read failures", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasDeploymentAddressMock.mockReturnValue(true)
    getLensContractMock.mockReturnValue({
      getMarketsData: jest.fn(),
    } as unknown as ReturnType<typeof getLensContract>)
  })

  it("preserves tolerant hydration for existing callers", async () => {
    refreshMarketsV2LiveDataSafeMock.mockRejectedValue(
      new Error("RPC unavailable"),
    )

    await expect(
      updateMarkets(
        [v2Market],
        provider as unknown as Parameters<typeof updateMarkets>[1],
        network as Parameters<typeof updateMarkets>[2],
      ),
    ).resolves.toEqual([v2Market])
  })

  it("propagates live-read failures for decision-critical callers", async () => {
    refreshMarketsV2LiveDataSafeMock.mockRejectedValue(
      new Error("RPC unavailable"),
    )

    await expect(
      updateMarkets(
        [v2Market],
        provider as unknown as Parameters<typeof updateMarkets>[1],
        network as Parameters<typeof updateMarkets>[2],
        { throwOnError: true },
      ),
    ).rejects.toThrow("RPC unavailable")
  })

  it("fails strictly when V1 markets cannot be hydrated", async () => {
    hasDeploymentAddressMock.mockReturnValue(false)
    const v1Market = {
      ...v2Market,
      version: MarketVersion.V1,
    } as Market

    await expect(
      updateMarkets(
        [v1Market],
        provider as unknown as Parameters<typeof updateMarkets>[1],
        network as Parameters<typeof updateMarkets>[2],
        { throwOnError: true },
      ),
    ).rejects.toThrow("No V1 market lens configured")
  })
})
