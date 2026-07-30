import { TokenWrapper } from "@wildcatfi/wildcat-sdk"
import { PublicClient } from "viem"

import { readWrapperAccountState } from "./useWrapperAccountState"

const MARKET_TOKEN = "0x1111111111111111111111111111111111111111"
const WRAPPER = "0x2222222222222222222222222222222222222222"
const ACCOUNT = "0x3333333333333333333333333333333333333333"

const success = (result: bigint) => ({
  status: "success" as const,
  result,
})

const failure = () => ({
  status: "failure" as const,
  error: new Error("read failed"),
})

const createWrapper = () => {
  const marketGetAmount = jest.fn((raw: bigint) => ({
    token: "market",
    raw,
  }))
  const shareGetAmount = jest.fn((raw: bigint) => ({
    token: "share",
    raw,
  }))

  return {
    wrapper: {
      address: WRAPPER,
      marketToken: {
        address: MARKET_TOKEN,
        getAmount: marketGetAmount,
      },
      shareToken: {
        address: WRAPPER,
        getAmount: shareGetAmount,
      },
    } as unknown as TokenWrapper,
    marketGetAmount,
    shareGetAmount,
  }
}

describe("readWrapperAccountState", () => {
  it("reads both balances, allowance, and all limits in one multicall", async () => {
    const multicall = jest
      .fn()
      .mockResolvedValue([
        success(1n),
        success(2n),
        success(3n),
        success(4n),
        success(5n),
        success(6n),
        success(7n),
      ])
    const { wrapper } = createWrapper()

    const state = await readWrapperAccountState(
      { multicall } as unknown as PublicClient,
      wrapper,
      ACCOUNT,
    )

    expect(multicall).toHaveBeenCalledTimes(1)
    const request = multicall.mock.calls[0][0]
    expect(request.allowFailure).toBe(true)
    expect(request.contracts).toHaveLength(7)
    expect(
      request.contracts.map(
        (contract: { functionName: string }) => contract.functionName,
      ),
    ).toEqual([
      "balanceOf",
      "balanceOf",
      "allowance",
      "maxDeposit",
      "maxMint",
      "maxWithdraw",
      "maxRedeem",
    ])
    expect(state).toEqual({
      balances: {
        marketBalance: { token: "market", raw: 1n },
        shareBalance: { token: "share", raw: 2n },
      },
      allowance: { token: "market", raw: 3n },
      limits: {
        maxDeposit: { token: "market", raw: 4n },
        maxMint: { token: "share", raw: 5n },
        maxWithdraw: { token: "market", raw: 6n },
        maxRedeem: { token: "share", raw: 7n },
      },
    })
  })

  it("preserves subgroup failure isolation", async () => {
    const multicall = jest
      .fn()
      .mockResolvedValue([
        success(1n),
        failure(),
        success(3n),
        success(4n),
        success(5n),
        success(6n),
        failure(),
      ])
    const { wrapper } = createWrapper()

    const state = await readWrapperAccountState(
      { multicall } as unknown as PublicClient,
      wrapper,
      ACCOUNT,
    )

    expect(state.balances).toBeUndefined()
    expect(state.allowance).toEqual({ token: "market", raw: 3n })
    expect(state.limits).toBeUndefined()
  })
})
