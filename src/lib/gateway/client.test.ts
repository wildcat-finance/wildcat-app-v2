import { getSubgraphClient, SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  getAppSubgraphClient,
  getRpcProxyUrl,
  getSubgraphProxyUrl,
} from "./client"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getSubgraphClient: jest.fn(),
}))

describe("browser gateway connections", () => {
  it.each([1, 11155111, 9745, 9746] as SupportedChainId[])(
    "routes chain %s through same-origin app endpoints without credentials",
    (chainId) => {
      expect(getRpcProxyUrl(chainId)).toBe(`/api/gateway/rpc/${chainId}`)
      expect(getSubgraphProxyUrl(chainId)).toBe(`/api/gateway/graph/${chainId}`)
      getAppSubgraphClient(chainId)
      expect(getSubgraphClient).toHaveBeenLastCalledWith(chainId, {
        endpoint: `/api/gateway/graph/${chainId}`,
      })
    },
  )
})
