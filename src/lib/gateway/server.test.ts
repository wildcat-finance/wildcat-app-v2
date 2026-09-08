/** @jest-environment node */

import { getSubgraphClient, SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getGatewayToken, getServerSubgraphClient } from "./server"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getSubgraphClient: jest.fn(),
}))

describe("server gateway connections", () => {
  const originalEnvironment = { ...process.env }
  afterEach(() => {
    process.env = { ...originalEnvironment }
    jest.clearAllMocks()
  })

  it("passes the server credential to SDK queries and metadata validation", () => {
    process.env.WILDCAT_GATEWAY_TOKEN = "test-only-key"
    getServerSubgraphClient(SupportedChainId.Sepolia)
    expect(getSubgraphClient).toHaveBeenCalledWith(SupportedChainId.Sepolia, {
      bearerToken: "test-only-key",
    })
  })

  it.each([undefined, "", " ", "invalid token", "invalid\nheader"])(
    "rejects an absent or invalid credential without falling back to public access",
    (token) => {
      if (token === undefined) delete process.env.WILDCAT_GATEWAY_TOKEN
      else process.env.WILDCAT_GATEWAY_TOKEN = token
      expect(getGatewayToken).toThrow(
        "WILDCAT_GATEWAY_TOKEN is missing or invalid",
      )
      expect(getSubgraphClient).not.toHaveBeenCalled()
    },
  )
})
