/* eslint-disable import/no-extraneous-dependencies */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import {
  DepositStatus,
  LenderRole,
  type Market,
  MarketAccount,
  MarketVersion,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { useDeposit } from "./useDeposit"

const chainId = SupportedChainId.Sepolia
const wallet = "0x1111111111111111111111111111111111111111"
const mockSafe = jest.fn()
const mockSigner = jest.fn()
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => mockSafe(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => mockSigner(),
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ targetChainId: 11155111 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

it.each([false, true])(
  "stops Deposit when KYC lapses after the modal opens (Safe: %s)",
  async (safeConnected) => {
    const send = jest.fn()
    mockSafe.mockReturnValue({
      connected: safeConnected,
      safe: { safeAddress: wallet, chainId },
      sdk: { txs: { send } },
    })
    mockSigner.mockReturnValue({
      chainId,
      getAddress: async () => wallet,
      sendTransaction: send,
    })
    const token = new Token(
      chainId,
      "0x2222222222222222222222222222222222222222",
      "Asset",
      "AST",
      6,
      false,
      {
        call: async () => {
          throw Error("Unexpected RPC call")
        },
      },
    )
    const amount = token.getAmount(100)
    const provider = {
      providerAddress: "0x3333333333333333333333333333333333333333",
      kind: "kyc" as const,
      isApproved: true,
      timeToLive: 0,
      isPullProvider: true,
      pullProviderIndex: 0,
      isPushProvider: false,
      pushProviderIndex: -1,
    }
    const market = {
      chainId,
      version: MarketVersion.V2,
      roleProviders: [provider],
      underlyingToken: token,
      maximumDeposit: amount,
      hooksConfig: {
        flags: { useOnDeposit: true },
        depositRequiresAccess: true,
      },
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as Market
    const credential = {
      lastApprovalTimestamp: 1,
      lastProvider: provider,
      isBlockedFromDeposits: false,
      canRefresh: true,
    }
    const account = new MarketAccount({
      market,
      account: wallet,
      role: LenderRole.Null,
      stateSource: "live",
      credential,
      scaledMarketBalance: BigInt(0),
      marketBalance: token.getAmount(0),
      underlyingBalance: amount,
      underlyingApproval: amount.raw,
    })
    let enrolled = true
    const refresh = jest
      .spyOn(account, "update")
      .mockImplementation(async () => {
        account.credential = enrolled ? credential : undefined
      })
    const deposit = jest.spyOn(account, "deposit")
    const approve = jest.spyOn(account, "populateApproveMarket")
    const setHash = jest.fn()
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const { result } = renderHook(() => useDeposit(account, setHash), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })

    expect(account.previewDeposit(amount).status).toBe(DepositStatus.Ready)
    enrolled = false
    await act(async () => {
      await expect(result.current.mutateAsync(amount)).rejects.toThrow(
        "marketDetails.lender.kyc.lenderHint",
      )
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(account.previewDeposit(amount).status).toBe(
      DepositStatus.RequiresAccess,
    )
    expect(deposit).not.toHaveBeenCalled()
    expect(approve).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
    expect(setHash).not.toHaveBeenCalled()
  },
)
