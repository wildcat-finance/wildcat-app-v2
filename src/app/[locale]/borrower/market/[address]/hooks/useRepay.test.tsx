/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import {
  getLensContract,
  getLensV2Contract,
  Market,
  MarketAccount,
  MarketVersion,
  Token,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber, utils, VoidSigner } from "ethers"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"

import { useRepay } from "./useRepay"

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: jest.fn(),
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: jest.fn(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: jest.fn(),
}))
jest.mock("@/utils/constants", () => ({
  isUSDTLikeToken: jest.fn(),
}))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getLensContract: jest.fn(),
  getLensV2Contract: jest.fn(),
}))
jest.mock("@/config/query-keys", () => ({
  QueryKeys: {
    Markets: {
      GET_MARKET: (...args: unknown[]) => ["market", ...args],
      GET_MARKET_ACCOUNT: {
        PREFIX: (...args: unknown[]) => ["market-account", ...args],
      },
    },
    Borrower: {
      GET_WITHDRAWALS: {
        PREFIX: (...args: unknown[]) => ["withdrawals", ...args],
      },
    },
  },
}))

const marketAddress = "0x3e285f49c52888d38cc09682e32febfff2dd9996"
const borrower = "0x0000000000000000000000000000000000000001"
const asset = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const transactionHash = `0x${"11".repeat(32)}`
const safeHash = `0x${"22".repeat(32)}`
const blockTag = 1_000_001
const marketInterface = new utils.Interface([
  "function repay(uint256 amount)",
  "function repayAndProcessUnpaidWithdrawalBatches(uint256 amount, uint256 maxBatches)",
])
const tokenInterface = new utils.Interface([
  "function approve(address spender, uint256 amount)",
])
const safeInterface = new utils.Interface([
  "function simulateAndRevert(address targetContract, bytes calldataPayload)",
])
const multicallInterface = new utils.Interface([
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] results)",
])

const arithmeticPanic = () =>
  Object.assign(new Error("arithmetic panic"), {
    code: "CALL_EXCEPTION",
    data: `0x4e487b71${"0".repeat(62)}11`,
  })

function setup({ safe = false, approvalRequired = false } = {}) {
  const signer = new VoidSigner(borrower)
  const token = new Token(1, asset, "USD Coin", "USDC", 6, false, signer)
  const receipt = { transactionHash, status: 1 }
  const wait = jest.fn().mockResolvedValue(receipt)
  const contractRepay = jest.fn().mockResolvedValue({
    hash: safe ? safeHash : transactionHash,
    wait,
  })
  const processBatches = jest.fn().mockResolvedValue({
    hash: safe ? safeHash : transactionHash,
    wait,
  })
  const freshState = {
    isClosed: false,
    // Reported liquidity is below reserved withdrawals + fees even after $4.
    totalAssets: BigNumber.from(3_402_029),
    normalizedUnclaimedWithdrawals: BigNumber.from(0),
    lastAccruedProtocolFees: BigNumber.from(8_783_188),
    unpaidWithdrawalBatchExpiries: [] as number[],
  }
  const getMarketData = jest.fn().mockResolvedValue(freshState)
  const lens = { getMarketData }
  jest
    .mocked(getLensContract)
    .mockReturnValue(lens as unknown as ReturnType<typeof getLensContract>)
  jest
    .mocked(getLensV2Contract)
    .mockReturnValue(lens as unknown as ReturnType<typeof getLensV2Contract>)
  const getBlockNumber = jest.fn().mockResolvedValue(blockTag)
  const simulateRepay = jest.fn().mockResolvedValue(undefined)
  const checkCombined = async (amount: BigNumber) => {
    if (
      freshState.totalAssets
        .add(amount)
        .lt(
          freshState.normalizedUnclaimedWithdrawals.add(
            freshState.lastAccruedProtocolFees,
          ),
        )
    ) {
      throw arithmeticPanic()
    }
  }
  const simulateCombined = jest.fn(checkCombined)
  const simulateSafeCombined = jest.fn(checkCombined)
  const simulateSafeRepay = jest.fn().mockResolvedValue(undefined)
  const simulateSafe = jest.fn(async ({ data }: { data: string }) => {
    const { calldataPayload } = safeInterface.decodeFunctionData(
      "simulateAndRevert",
      data,
    )
    const { calls } = multicallInterface.decodeFunctionData(
      "aggregate3",
      calldataPayload,
    )
    const results = await Promise.all(
      calls.map(async (call: { target: string; callData: string }) => {
        try {
          if (call.target.toLowerCase() === marketAddress) {
            const { name, args } = marketInterface.parseTransaction({
              data: call.callData,
            })
            if (name === "repay") {
              await simulateSafeRepay(args.amount)
            } else {
              await simulateSafeCombined(args.amount)
            }
          }
          return { success: true, returnData: "0x" }
        } catch (error) {
          return {
            success: false,
            returnData: (error as { data: string }).data,
          }
        }
      }),
    )
    const resultData = multicallInterface.encodeFunctionResult("aggregate3", [
      results,
    ])
    return utils.hexConcat([
      utils.hexZeroPad("0x01", 32),
      utils.hexZeroPad(utils.hexlify(utils.hexDataLength(resultData)), 32),
      resultData,
    ])
  })
  const marketAccount = {
    account: borrower,
    isBorrower: true,
    underlyingApproval: BigNumber.from(
      approvalRequired ? 1_000_000 : 10_000_000,
    ),
    previewRepay: jest.fn().mockReturnValue({
      status: approvalRequired ? "InsufficientAllowance" : "Ready",
    }),
    populateApproveMarket: jest.fn(async (amount: TokenAmount) => ({
      to: asset,
      data: tokenInterface.encodeFunctionData("approve", [
        marketAddress,
        amount.raw,
      ]),
      value: "0",
    })),
    market: {
      address: marketAddress,
      chainId: 1,
      version: MarketVersion.V2,
      provider: signer,
      signer,
      underlyingToken: token,
      totalAssets: token.getAmount(3_402_029),
      normalizedUnclaimedWithdrawals: token.getAmount(0),
      lastAccruedProtocolFees: token.getAmount(8_783_188),
      unpaidWithdrawalBatchExpiries: [] as number[],
      contract: {
        interface: marketInterface,
        provider: { getBlockNumber, call: simulateSafe },
        repay: contractRepay,
        repayAndProcessUnpaidWithdrawalBatches: processBatches,
        callStatic: {
          repay: simulateRepay,
          repayAndProcessUnpaidWithdrawalBatches: simulateCombined,
        },
      },
    },
  } as unknown as MarketAccount
  // Exercise the installed SDK's actual signer checks and repayment encoding.
  marketAccount.repay = jest.fn((amount) =>
    MarketAccount.prototype.repay.call(marketAccount, amount),
  )
  marketAccount.populateRepay = jest.fn((amount) =>
    MarketAccount.prototype.populateRepay.call(marketAccount, amount),
  )
  marketAccount.market.repayAndProcessUnpaidWithdrawalBatches = jest.fn(
    (amount, maxBatches) =>
      Market.prototype.repayAndProcessUnpaidWithdrawalBatches.call(
        marketAccount.market,
        amount,
        maxBatches,
      ),
  )
  const populateProcessBatches = jest.fn((amount, maxBatches) =>
    Market.prototype.populateRepayAndProcessUnpaidWithdrawalBatches.call(
      marketAccount.market,
      amount,
      maxBatches,
    ),
  )
  marketAccount.market.populateRepayAndProcessUnpaidWithdrawalBatches =
    populateProcessBatches
  const send = jest.fn().mockResolvedValue({ safeTxHash: safeHash })
  const getBySafeTxHash = jest
    .fn()
    .mockResolvedValue({ txHash: transactionHash })
  const getTransactionReceipt = jest.fn().mockResolvedValue(receipt)
  jest.mocked(useSafeAppsSDK).mockReturnValue({
    connected: safe,
    sdk: { txs: { send, getBySafeTxHash }, eth: { getTransactionReceipt } },
  } as unknown as ReturnType<typeof useSafeAppsSDK>)
  jest.mocked(useCurrentNetwork).mockReturnValue({
    targetChainId: 1,
  } as ReturnType<typeof useCurrentNetwork>)
  jest
    .mocked(useEthersSigner)
    .mockReturnValue(signer as unknown as ReturnType<typeof useEthersSigner>)
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 } },
  })
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const setTxHash = jest.fn()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(
    () => useRepay(marketAccount, setTxHash, true),
    { wrapper },
  )
  const repay = async (rawAmount: number) => {
    await act(async () => {
      await result.current.mutateAsync(token.getAmount(rawAmount))
    })
  }

  return {
    marketAccount,
    freshState,
    getMarketData,
    getBlockNumber,
    simulateRepay,
    simulateCombined,
    simulateSafe,
    simulateSafeCombined,
    simulateSafeRepay,
    result,
    token,
    repay,
    contractRepay,
    processBatches,
    populateProcessBatches,
    send,
    wait,
    getBySafeTxHash,
    getTransactionReceipt,
    setTxHash,
    invalidate,
  }
}

describe("useRepay", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(isUSDTLikeToken).mockReturnValue(false)
    jest.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  it.each<[number, number[]]>([
    [1, []],
    [3_000_000, []],
    [4_000_000, []],
    [4_000_000, [1_700_000_000]],
    [10_000_000, []],
  ])(
    "repays exactly %i base units with unpaid batches %j",
    async (amount, batches) => {
      const fixture = setup()
      fixture.freshState.unpaidWithdrawalBatchExpiries = batches

      await fixture.repay(amount)

      expect(fixture.contractRepay).toHaveBeenCalledTimes(1)
      expect(fixture.contractRepay).toHaveBeenCalledWith(BigNumber.from(amount))
      expect(fixture.wait).toHaveBeenCalledTimes(1)
      expect(fixture.getMarketData).toHaveBeenCalledWith(marketAddress, {
        blockTag,
      })
      expect(fixture.simulateRepay).toHaveBeenCalledWith(
        BigNumber.from(amount),
        { blockTag },
      )
      if (batches.length) {
        expect(fixture.simulateCombined.mock.calls).toEqual([
          [BigNumber.from(amount), batches.length, { blockTag }],
          [BigNumber.from(amount), 0, { blockTag }],
        ])
      } else {
        expect(fixture.simulateCombined).not.toHaveBeenCalled()
      }
      expect(fixture.processBatches).not.toHaveBeenCalled()
      expect(fixture.populateProcessBatches).not.toHaveBeenCalled()
      expect(fixture.send).not.toHaveBeenCalled()
      expect(fixture.setTxHash).toHaveBeenCalledWith(transactionHash)
      expect(fixture.invalidate).toHaveBeenCalledWith({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(1, marketAddress),
      })
    },
  )

  it.each([
    [false, 5_381_159], // Exactly covers reserves and fees; no underflow.
    [false, 5_381_160], // Even one unit of partial funding keeps processing.
    [false, 6_000_000],
    [false, 10_000_000],
    [true, 6_000_000],
  ] as const)(
    "keeps repayment and processing together (Safe: %s, amount: %i)",
    async (safe, amount) => {
      const fixture = setup({ safe })
      // The cached queue is empty; routing must use the freshly read queue.
      fixture.freshState.unpaidWithdrawalBatchExpiries = [1, 2]

      await fixture.repay(amount)

      expect(fixture.processBatches).toHaveBeenCalledTimes(1)
      expect(fixture.processBatches).toHaveBeenCalledWith(
        BigNumber.from(amount),
        2,
      )
      expect(fixture.simulateCombined).toHaveBeenCalledWith(
        BigNumber.from(amount),
        2,
        { blockTag },
      )
      expect(fixture.simulateRepay).not.toHaveBeenCalled()
      expect(fixture.contractRepay).not.toHaveBeenCalled()
      expect(fixture.send).not.toHaveBeenCalled()
      expect(fixture.setTxHash).toHaveBeenCalledWith(transactionHash)
    },
  )

  it("trusts successful execution over a pre-payment liquidity quote", async () => {
    const fixture = setup()
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    // Repaying before expiry settlement can change the subsequent fee accrual.
    fixture.simulateCombined.mockResolvedValueOnce(undefined)

    await fixture.repay(4_000_000)

    expect(fixture.processBatches).toHaveBeenCalledTimes(1)
    expect(fixture.contractRepay).not.toHaveBeenCalled()
  })

  it.each([MarketVersion.V1, MarketVersion.V2])(
    "reads the appropriate lens for market version %s",
    async (version) => {
      const fixture = setup()
      fixture.marketAccount.market.version = version

      await fixture.repay(4_000_000)

      expect(
        version === MarketVersion.V1 ? getLensContract : getLensV2Contract,
      ).toHaveBeenCalledTimes(1)
      expect(
        version === MarketVersion.V1 ? getLensV2Contract : getLensContract,
      ).not.toHaveBeenCalled()
    },
  )

  it("includes approval and exact repayment in one Safe proposal", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1_700_000_000]

    await fixture.repay(4_000_000)

    expect(fixture.send).toHaveBeenCalledTimes(1)
    expect(fixture.send).toHaveBeenCalledWith({
      txs: [
        {
          to: asset,
          data: tokenInterface.encodeFunctionData("approve", [
            marketAddress,
            4_000_000,
          ]),
          value: "0",
        },
        {
          to: marketAddress,
          data: marketInterface.encodeFunctionData("repay", [4_000_000]),
          value: "0",
        },
      ],
    })
    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.simulateRepay).not.toHaveBeenCalled()
    expect(fixture.simulateCombined).not.toHaveBeenCalled()
    expect(fixture.populateProcessBatches).not.toHaveBeenCalled()
    expect(fixture.processBatches).not.toHaveBeenCalled()
    expect(fixture.setTxHash).toHaveBeenCalledWith(transactionHash)
    // All three candidates include the approval, preserve the Safe as caller,
    // and use the same block as the lens read.
    expect(fixture.simulateSafe).toHaveBeenCalledTimes(3)
    const candidates = fixture.simulateSafe.mock.calls.map(([request]) => {
      expect(request).toMatchObject({ from: borrower, to: borrower })
      const { targetContract, calldataPayload } =
        safeInterface.decodeFunctionData("simulateAndRevert", request.data)
      expect(targetContract.toLowerCase()).toBe(
        "0xca11bde05977b3631167028862be2a173976ca11",
      )
      const { calls } = multicallInterface.decodeFunctionData(
        "aggregate3",
        calldataPayload,
      )
      expect(calls).toHaveLength(2)
      expect(calls[0].callData).toBe(
        tokenInterface.encodeFunctionData("approve", [
          marketAddress,
          4_000_000,
        ]),
      )
      expect(calls[1].target.toLowerCase()).toBe(marketAddress)
      return calls[1].callData
    })
    expect(candidates).toEqual([
      marketInterface.encodeFunctionData(
        "repayAndProcessUnpaidWithdrawalBatches",
        [4_000_000, 1],
      ),
      marketInterface.encodeFunctionData(
        "repayAndProcessUnpaidWithdrawalBatches",
        [4_000_000, 0],
      ),
      marketInterface.encodeFunctionData("repay", [4_000_000]),
    ])
    fixture.simulateSafe.mock.calls.forEach(([request]) => {
      expect(fixture.simulateSafe).toHaveBeenCalledWith(request, blockTag)
    })
  })

  it.each([false, true])(
    "keeps funding partial batches in the Safe approval proposal (reset: %s)",
    async (resetRequired) => {
      jest.mocked(isUSDTLikeToken).mockReturnValue(resetRequired)
      const fixture = setup({ safe: true, approvalRequired: true })
      fixture.freshState.unpaidWithdrawalBatchExpiries = [1, 2]

      await fixture.repay(6_000_000)

      const approval = (amount: number) => ({
        to: asset,
        data: tokenInterface.encodeFunctionData("approve", [
          marketAddress,
          amount,
        ]),
        value: "0",
      })
      expect(fixture.send).toHaveBeenCalledTimes(1)
      expect(fixture.send).toHaveBeenCalledWith({
        txs: [
          ...(resetRequired ? [approval(0)] : []),
          approval(6_000_000),
          {
            to: marketAddress,
            data: marketInterface.encodeFunctionData(
              "repayAndProcessUnpaidWithdrawalBatches",
              [6_000_000, 2],
            ),
            value: "0",
          },
        ],
      })
      expect(fixture.simulateCombined).not.toHaveBeenCalled()
      expect(fixture.simulateRepay).not.toHaveBeenCalled()
      expect(fixture.processBatches).not.toHaveBeenCalled()
      expect(fixture.contractRepay).not.toHaveBeenCalled()
    },
  )

  it("uses simulated Safe execution instead of cached liquidity", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.freshState.normalizedUnclaimedWithdrawals =
      BigNumber.from(8_000_000)
    fixture.freshState.lastAccruedProtocolFees = BigNumber.from(783_188)
    // Cached fields would incorrectly select the combined call.
    fixture.marketAccount.market.totalAssets =
      fixture.token.getAmount(100_000_000)
    fixture.marketAccount.market.unpaidWithdrawalBatchExpiries = [1]

    await fixture.repay(4_000_000)

    expect(fixture.populateProcessBatches).not.toHaveBeenCalled()
    expect(fixture.marketAccount.populateRepay).toHaveBeenCalledWith(
      BigNumber.from(4_000_000),
    )
  })

  it("falls back when pending-batch rounding invalidates a sufficient Safe quote", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.freshState.totalAssets = BigNumber.from(0)
    fixture.freshState.lastAccruedProtocolFees = BigNumber.from(3_999_996)
    // The payment leaves four units, but expiring-batch settlement reserves
    // five. Both combined calls panic even though the quote appears sufficient.
    fixture.simulateSafeCombined.mockRejectedValue(arithmeticPanic())

    await fixture.repay(4_000_000)

    expect(fixture.simulateSafeCombined).toHaveBeenCalledTimes(2)
    expect(fixture.simulateSafeRepay).toHaveBeenCalledTimes(1)
    expect(fixture.send).toHaveBeenCalledTimes(1)
    expect(fixture.send.mock.calls[0][0].txs[1].data).toBe(
      marketInterface.encodeFunctionData("repay", [4_000_000]),
    )
  })

  it("keeps combined Safe repayment when execution succeeds despite an insufficient quote", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateSafeCombined.mockResolvedValueOnce(undefined)

    await fixture.repay(4_000_000)

    expect(fixture.simulateSafe).toHaveBeenCalledTimes(1)
    expect(fixture.send.mock.calls[0][0].txs[1].data).toBe(
      marketInterface.encodeFunctionData(
        "repayAndProcessUnpaidWithdrawalBatches",
        [4_000_000, 1],
      ),
    )
  })

  it("rejects a Safe batch-loop panic without attempting ordinary repayment", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateSafeCombined
      .mockRejectedValueOnce(arithmeticPanic())
      .mockResolvedValueOnce(undefined)

    await expect(fixture.repay(4_000_000)).rejects.toMatchObject({
      data: arithmeticPanic().data,
    })

    expect(fixture.simulateSafeRepay).not.toHaveBeenCalled()
    expect(fixture.send).not.toHaveBeenCalled()
  })

  it("requires the fallback Safe repayment to succeed", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateSafeRepay.mockRejectedValueOnce({ data: "0xdeadbeef" })

    await expect(fixture.repay(4_000_000)).rejects.toMatchObject({
      data: "0xdeadbeef",
    })

    expect(fixture.send).not.toHaveBeenCalled()
  })

  it("does not fall back or submit when Safe simulation is unavailable", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateSafe.mockRejectedValueOnce(new Error("RPC unavailable"))

    await expect(fixture.repay(4_000_000)).rejects.toThrow(
      "Could not simulate Safe approval and repayment",
    )

    expect(fixture.simulateSafe).toHaveBeenCalledTimes(1)
    expect(fixture.send).not.toHaveBeenCalled()
  })

  it("keeps a required allowance reset before approval and repayment in the Safe proposal", async () => {
    jest.mocked(isUSDTLikeToken).mockReturnValue(true)
    const fixture = setup({ safe: true, approvalRequired: true })

    await fixture.repay(4_000_000)

    expect(fixture.send).toHaveBeenCalledTimes(1)
    const { txs } = fixture.send.mock.calls[0][0]
    expect(txs).toHaveLength(3)
    expect(txs.map((tx: { data: string }) => tx.data)).toEqual([
      tokenInterface.encodeFunctionData("approve", [marketAddress, 0]),
      tokenInterface.encodeFunctionData("approve", [marketAddress, 4_000_000]),
      marketInterface.encodeFunctionData("repay", [4_000_000]),
    ])
    expect(fixture.populateProcessBatches).not.toHaveBeenCalled()
    expect(fixture.simulateSafe).toHaveBeenCalledTimes(1)
    expect(fixture.simulateSafeRepay).toHaveBeenCalledTimes(1)
  })

  it("submits only repayment for an already approved Safe and resolves its execution hash", async () => {
    const fixture = setup({ safe: true })

    await fixture.repay(4_000_000)

    expect(fixture.contractRepay).toHaveBeenCalledTimes(1)
    expect(fixture.send).not.toHaveBeenCalled()
    expect(fixture.getBySafeTxHash).toHaveBeenCalledWith(safeHash)
    expect(fixture.getTransactionReceipt).toHaveBeenCalledWith([
      transactionHash,
    ])
    expect(fixture.setTxHash).toHaveBeenCalledWith(transactionHash)
    expect(fixture.processBatches).not.toHaveBeenCalled()
  })

  it("does not submit on the wrong network", async () => {
    const fixture = setup()
    fixture.marketAccount.market.chainId = 11155111

    await expect(fixture.repay(4_000_000)).rejects.toThrow(
      "chainId does not match",
    )

    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.send).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    "rejects insufficient funds before submission (Safe: %s)",
    async (safe) => {
      const fixture = setup({ safe })
      jest.mocked(fixture.marketAccount.previewRepay).mockReturnValue({
        status: "InsufficientBalance",
      } as ReturnType<MarketAccount["previewRepay"]>)

      await expect(fixture.repay(4_000_000)).rejects.toThrow()

      expect(fixture.contractRepay).not.toHaveBeenCalled()
      expect(fixture.send).not.toHaveBeenCalled()
    },
  )

  it.each([
    new Error("RPC unavailable"),
    Object.assign(new Error("hook rejected repayment"), { data: "0xdeadbeef" }),
    Object.assign(new Error("different arithmetic panic"), {
      data: `0x4e487b71${"0".repeat(62)}12`,
    }),
  ])(
    "does not fall back after an unrelated preflight error: %s",
    async (error) => {
      const fixture = setup()
      fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
      fixture.simulateCombined.mockRejectedValueOnce(error)

      await expect(fixture.repay(4_000_000)).rejects.toBe(error)

      expect(fixture.simulateRepay).not.toHaveBeenCalled()
      expect(fixture.contractRepay).not.toHaveBeenCalled()
      expect(fixture.processBatches).not.toHaveBeenCalled()
      expect(fixture.send).not.toHaveBeenCalled()
    },
  )

  it("does not classify a batch-loop panic as the subtraction bug", async () => {
    const fixture = setup()
    const error = arithmeticPanic()
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateCombined
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)

    await expect(fixture.repay(4_000_000)).rejects.toBe(error)

    expect(fixture.simulateRepay).not.toHaveBeenCalled()
    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.processBatches).not.toHaveBeenCalled()
  })

  it("requires plain repayment to pass preflight before using the fallback", async () => {
    const fixture = setup()
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.simulateRepay.mockRejectedValueOnce(new Error("repayment rejected"))

    await expect(fixture.repay(4_000_000)).rejects.toThrow("repayment rejected")

    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.processBatches).not.toHaveBeenCalled()
  })

  it("does not submit using cached data when the fresh read fails", async () => {
    const fixture = setup()
    fixture.getMarketData.mockRejectedValueOnce(new Error("lens unavailable"))

    await expect(fixture.repay(4_000_000)).rejects.toThrow("lens unavailable")

    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.processBatches).not.toHaveBeenCalled()
  })

  it("does not propose repayment to a market that has since closed", async () => {
    const fixture = setup({ safe: true, approvalRequired: true })
    fixture.freshState.isClosed = true

    await expect(fixture.repay(4_000_000)).rejects.toThrow("closed market")

    expect(fixture.send).not.toHaveBeenCalled()
  })

  it("never falls back after calling the transaction submission method", async () => {
    const fixture = setup()
    const error = arithmeticPanic()
    fixture.freshState.unpaidWithdrawalBatchExpiries = [1]
    fixture.processBatches.mockRejectedValueOnce(error)

    await expect(fixture.repay(6_000_000)).rejects.toBe(error)

    expect(fixture.processBatches).toHaveBeenCalledTimes(1)
    expect(fixture.contractRepay).not.toHaveBeenCalled()
    expect(fixture.invalidate).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    "does not resubmit after a receipt failure (combined: %s)",
    async (combined) => {
      const fixture = setup()
      fixture.freshState.unpaidWithdrawalBatchExpiries = combined ? [1] : []
      fixture.wait.mockRejectedValue(new Error("receipt lookup failed"))

      await expect(fixture.repay(6_000_000)).rejects.toThrow(
        "receipt lookup failed",
      )

      expect(fixture.contractRepay).toHaveBeenCalledTimes(combined ? 0 : 1)
      expect(fixture.processBatches).toHaveBeenCalledTimes(combined ? 1 : 0)
      expect(fixture.send).not.toHaveBeenCalled()
      expect(fixture.invalidate).not.toHaveBeenCalled()
    },
  )
})
