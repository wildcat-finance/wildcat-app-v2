/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import {
  HooksKind,
  LenderRole,
  Market,
  MarketAccount,
  MarketVersion,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { useSetMaxTotalSupply } from "./useCapacity"
import { useSetFixedTermEndTime } from "./useSetFixedTermEndTime"
import { useSetMinimumDeposit } from "./useSetMinimumDeposit"

const address = "0x1111111111111111111111111111111111111111"
const signer = {
  _isSigner: true,
  provider: {},
  getAddress: async () => address,
  call: jest.fn(),
  sendTransaction: jest.fn(),
}

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false, sdk: {} }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({ signer, targetChainId: 11155111 }),
  useEthersSigner: () => signer,
}))

const REPAYMENT_DATE = 1_800_000_000
const makeAccount = () => {
  const token = new Token(11155111, address, "Asset", "AST", 6, false, signer)
  const market = Object.assign(Object.create(Market.prototype), {
    _provider: signer,
    chainId: 11155111,
    version: MarketVersion.V2,
    borrower: address,
    marketToken: token,
    underlyingToken: token,
    hooksTemplateAddress: "0xa3FE06137cc893E19C2E4764a4A7b001E988ba2B",
    repaymentDate: REPAYMENT_DATE,
    lastInterestAccruedTimestamp: REPAYMENT_DATE - 1,
    isClosed: false,
    hooksConfig: {
      kind: HooksKind.FixedTerm,
      fixedTermEndTime: REPAYMENT_DATE,
      allowTermReduction: true,
      flags: { useOnDeposit: true },
    },
  }) as Market
  const update = jest.spyOn(market, "update").mockImplementation(async () => {
    market.lastInterestAccruedTimestamp = REPAYMENT_DATE
  })
  const account = new MarketAccount({
    market,
    account: address,
    role: LenderRole.Null,
    marketBalance: token.getAmount(0),
    underlyingBalance: token.getAmount(0),
    scaledMarketBalance: BigInt(0),
    underlyingApproval: BigInt(0),
  })
  return { account, update }
}

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const useParameterChange = (account: MarketAccount, kind: string) => {
  const capacity = useSetMaxTotalSupply(account, jest.fn())
  const minimumDeposit = useSetMinimumDeposit(account, jest.fn())
  const maturity = useSetFixedTermEndTime(account, jest.fn())
  return () => {
    if (kind === "capacity") return capacity.mutateAsync("100")
    if (kind === "minimumDeposit") return minimumDeposit.mutateAsync("0")
    return maturity.mutateAsync(REPAYMENT_DATE - 1)
  }
}

describe("parameter submission refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(["capacity", "minimumDeposit", "maturity"])(
    "refreshes %s and lets the real SDK stop submission if repayment has started",
    async (kind) => {
      const { account, update } = makeAccount()
      expect(account.market.hasFrozenHookParameters).toBe(false)
      const { result } = renderHook(() => useParameterChange(account, kind), {
        wrapper: createWrapper(),
      })
      await act(async () => {
        await expect(result.current()).rejects.toThrow("MarketInRepayment")
      })
      expect(update).toHaveBeenCalledTimes(1)
      expect(signer.sendTransaction).not.toHaveBeenCalled()
    },
  )

  it("does not submit if the live read fails", async () => {
    const { account, update } = makeAccount()
    update.mockRejectedValueOnce(new Error("RPC unavailable"))
    const { result } = renderHook(
      () => useParameterChange(account, "capacity"),
      { wrapper: createWrapper() },
    )
    await act(async () => {
      await expect(result.current()).rejects.toThrow("RPC unavailable")
    })
    expect(signer.sendTransaction).not.toHaveBeenCalled()
  })
})
