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
        success(BigInt(1)),
        success(BigInt(2)),
        success(BigInt(3)),
        success(BigInt(4)),
        success(BigInt(5)),
        success(BigInt(6)),
        success(BigInt(7)),
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
        marketBalance: { token: "market", raw: BigInt(1) },
        shareBalance: { token: "share", raw: BigInt(2) },
      },
      allowance: { token: "market", raw: BigInt(3) },
      limits: {
        maxDeposit: { token: "market", raw: BigInt(4) },
        maxMint: { token: "share", raw: BigInt(5) },
        maxWithdraw: { token: "market", raw: BigInt(6) },
        maxRedeem: { token: "share", raw: BigInt(7) },
      },
    })
  })

  it("preserves subgroup failure isolation", async () => {
    const multicall = jest
      .fn()
      .mockResolvedValue([
        success(BigInt(1)),
        failure(),
        success(BigInt(3)),
        success(BigInt(4)),
        success(BigInt(5)),
        success(BigInt(6)),
        failure(),
      ])
    const { wrapper } = createWrapper()

    const state = await readWrapperAccountState(
      { multicall } as unknown as PublicClient,
      wrapper,
      ACCOUNT,
    )

    expect(state.balances).toBeUndefined()
    expect(state.allowance).toEqual({ token: "market", raw: BigInt(3) })
    expect(state.limits).toBeUndefined()
  })
})
