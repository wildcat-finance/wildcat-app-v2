/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import {
  LenderRole,
  Market,
  MarketAccount,
  MarketVersion,
  Token,
  wildcatMarketV2Abi,
} from "@wildcatfi/wildcat-sdk"
import { decodeFunctionData, Hex } from "viem"

import { QueryKeys } from "@/config/query-keys"

import { useRecoverUnderlying } from "./useRecoverUnderlying"

const BORROWER = "0x1111111111111111111111111111111111111111"
const MARKET = "0x2222222222222222222222222222222222222222"
const ASSET = "0x3333333333333333333333333333333333333333"
const HASH = `0x${"44".repeat(32)}`
const SAFE_HASH = `0x${"55".repeat(32)}`
const signer = {
  _isSigner: true,
  chainId: 11155111,
  provider: {},
  getAddress: jest.fn(),
  sendTransaction: jest.fn(),
  call: jest.fn(),
}
let safeConnected = false
let targetChainId = 11155111
const sendSafe = jest.fn()
const waitForSubmitted = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({
    connected: safeConnected,
    sdk: { txs: { send: sendSafe } },
  }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersSigner: () => signer }))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ targetChainId }),
}))
jest.mock("@/utils/transactions", () => ({
  waitForSubmittedTransaction: (...args: unknown[]) =>
    waitForSubmitted(...args),
}))

const setup = () => {
  const token = new Token(11155111, ASSET, "Asset", "AST", 6, false, signer)
  const market = Object.assign(Object.create(Market.prototype), {
    _provider: signer,
    chainId: 11155111,
    version: MarketVersion.V2,
    address: MARKET,
    borrower: BORROWER,
    underlyingToken: token,
    marketToken: token,
    repaymentDate: 0,
    isClosed: true,
    stateSource: "live",
    liquidity: { recoverableUnderlying: token.parseAmount("25") },
  }) as Market
  const account = new MarketAccount({
    market,
    account: BORROWER,
    role: LenderRole.Null,
    marketBalance: token.getAmount(0),
    underlyingBalance: token.getAmount(0),
    scaledMarketBalance: BigInt(0),
    underlyingApproval: BigInt(0),
  })
  const update = jest.spyOn(market, "update").mockResolvedValue(undefined)
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const detailKey = QueryKeys.Markets.GET_MARKET(market.chainId, market.address)
  client.setQueryData(detailKey, "old")
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const setTxHash = jest.fn()
  const { result, rerender } = renderHook(
    () => useRecoverUnderlying(account, setTxHash),
    { wrapper },
  )
  return {
    account,
    market,
    token,
    update,
    client,
    detailKey,
    result,
    setTxHash,
    rerender,
  }
}

describe("borrower surplus recovery", () => {
  // jest.setup supplies Node's encoder to jsdom; viem requires bytes in the
  // current realm. Keep real SDK calldata encoding in this hook test.
  const { encode } = TextEncoder.prototype
  beforeAll(() => {
    jest
      .spyOn(TextEncoder.prototype, "encode")
      .mockImplementation(function encodeInRealm(this: TextEncoder, input) {
        return Uint8Array.from(encode.call(this, input))
      })
  })
  afterAll(() => jest.restoreAllMocks())
  beforeEach(() => {
    jest.clearAllMocks()
    safeConnected = false
    targetChainId = 11155111
    signer.chainId = 11155111
    signer.getAddress.mockResolvedValue(BORROWER)
    signer.sendTransaction.mockResolvedValue({ hash: HASH })
    sendSafe.mockResolvedValue({ safeTxHash: SAFE_HASH })
    waitForSubmitted.mockResolvedValue({ hash: HASH, receipt: { status: 1 } })
  })

  it.each([false, true])(
    "refreshes and submits the SDK recovery call via Safe=%s, then invalidates state only after confirmation",
    async (safe) => {
      safeConnected = safe
      const { update, client, detailKey, result, setTxHash } = setup()
      await act(async () => {
        await result.current.mutateAsync()
      })
      expect(update).toHaveBeenCalledTimes(1)
      const tx = safe
        ? sendSafe.mock.calls[0][0].txs[0]
        : signer.sendTransaction.mock.calls[0][0]
      expect(tx.to).toBe(MARKET)
      expect(
        decodeFunctionData({ abi: wildcatMarketV2Abi, data: tx.data as Hex }),
      ).toMatchObject({ functionName: "rescueTokens", args: [ASSET] })
      expect(signer.sendTransaction).toHaveBeenCalledTimes(safe ? 0 : 1)
      expect(sendSafe).toHaveBeenCalledTimes(safe ? 1 : 0)
      expect(waitForSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({ safeConnected: safe }),
      )
      if (safe) expect(setTxHash).not.toHaveBeenCalledWith(SAFE_HASH)
      expect(setTxHash).toHaveBeenLastCalledWith(HASH)
      expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true)
    },
  )

  it.each([false, true])(
    "refuses stale surplus or a failed live refresh via Safe=%s",
    async (safe) => {
      safeConnected = safe
      const { market, token, update, result } = setup()
      update.mockImplementationOnce(async () => {
        market.liquidity!.recoverableUnderlying = token.getAmount(0)
      })
      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow(
          "NoRecoverableUnderlying",
        )
      })
      update.mockRejectedValueOnce(new Error("RPC unavailable"))
      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow(
          "RPC unavailable",
        )
      })
      expect(signer.sendTransaction).not.toHaveBeenCalled()
      expect(sendSafe).not.toHaveBeenCalled()
    },
  )

  it.each(["legacy", "open", "indexed"])(
    "requires a supported closed market and a live quote: %s",
    async (kind) => {
      const { market, result } = setup()
      if (kind === "legacy") market.repaymentDate = undefined
      if (kind === "open") market.isClosed = false
      if (kind === "indexed") market.stateSource = "indexed"
      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow(
          "Cannot recover surplus",
        )
      })
      expect(signer.sendTransaction).not.toHaveBeenCalled()
    },
  )

  it.each(["wallet", "account", "chain", "target"])(
    "blocks an identity mismatch: %s",
    async (kind) => {
      const { account, result, update, rerender } = setup()
      if (kind === "wallet") signer.getAddress.mockResolvedValue(ASSET)
      if (kind === "account") account.account = ASSET
      if (kind === "chain") signer.chainId = 1
      if (kind === "target") targetChainId = 1
      rerender()
      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow()
      })
      expect(update).not.toHaveBeenCalled()
      expect(signer.sendTransaction).not.toHaveBeenCalled()
      expect(sendSafe).not.toHaveBeenCalled()
    },
  )

  it("does not report success or invalidate state for a failed transaction", async () => {
    const { result, client, detailKey } = setup()
    waitForSubmitted.mockRejectedValueOnce(new Error("Transaction reverted"))
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        "Transaction reverted",
      )
    })
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(false)
  })
})
