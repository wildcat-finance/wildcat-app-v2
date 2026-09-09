/* eslint-disable import/no-extraneous-dependencies */
// Real modal, numeric input, SDK amounts and transaction hooks; simulated wallet/RPC I/O.
import React from "react"

import { ThemeProvider } from "@mui/material"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import {
  Market,
  MarketAccount,
  MarketVersion,
  HooksKind,
  Signer,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber, utils } from "ethers"

import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { theme } from "@/theme/theme"

import { useDeposit } from "../../../hooks/useDeposit"

const mockAddress = "0x0000000000000000000000000000000000000011"
const mockSigner = {
  _isSigner: true,
  chainId: 1,
  getAddress: jest.fn(async () => mockAddress),
}
let mockConnectedAddress = mockAddress
let mockMobile = false
let mockSafeConnected = false
const mockSafeSend = jest.fn()

jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[0-9a-f]{40}$/i.test(value),
}))
jest.mock("@/assets/icons/arrowLeft_icon.svg", () => () => null)
jest.mock("@/assets/icons/cross_icon.svg", () => () => null)
jest.mock("@/assets/icons/check_icon.svg", () => () => null)
jest.mock("@/assets/icons/link_icon.svg", () => () => null)
jest.mock("@/assets/icons/circledCrossRed_icon.svg", () => () => null)
jest.mock("@/assets/icons/clock_icon.svg", () => () => null)
jest.mock("@/assets/icons/circledAlert_icon.svg", () => () => null)
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: mockConnectedAddress }),
}))
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({
    connected: mockSafeConnected,
    safe: { chainId: 1, safeAddress: mockAddress },
    sdk: {
      txs: {
        send: (...args: unknown[]) => mockSafeSend(...args),
        getBySafeTxHash: async () => ({ txHash: "0xsafe" }),
      },
      eth: {
        getTransactionReceipt: async () => ({ transactionHash: "0xsafe" }),
      },
    },
  }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => mockSigner,
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ targetChainId: 1 }),
}))
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({
    touGateState: "unblocked",
    isWrongNetwork: false,
    isSelectionMismatch: false,
  }),
}))
jest.mock("@/hooks/useDepositAgreementGate", () => ({
  useDepositAgreementGate: () => ({ state: "satisfied" }),
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => mockMobile,
}))
jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: () => ({
    getTxUrl: () => "#tx",
    getAddressUrl: () => "#address",
  }),
}))
jest.mock("@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile", () => ({
  useGetBorrowerProfile: () => ({ data: { name: "Test Borrower" } }),
}))
jest.mock("@/components/Toasts", () => ({
  toastRequest: (promise: Promise<unknown>) => promise,
  toastError: jest.fn(),
}))
jest.mock("@/components/TooltipButton", () => ({ TooltipButton: () => null }))
jest.mock("@/components/LinkComponent", () => ({ LinkGroup: () => null }))
jest.mock(
  "@/app/[locale]/lender/market/[address]/components/BorrowerPenaltyWarning",
  () => ({ BorrowerPenaltyWarning: () => null }),
)
jest.mock(
  "@/app/[locale]/lender/market/[address]/components/Modals/NonMlaAcknowledgementModal",
  () => ({ NonMlaAcknowledgementModal: () => null }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal",
  () => ({ LoadingModal: () => <div>Pending transaction</div> }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal",
  () => ({
    SuccessModal: ({ onClose }: { onClose: () => void }) => (
      <button onClick={onClose}>Success close</button>
    ),
  }),
)
jest.mock("react-i18next", () => {
  const translations: Record<string, string> = {
    "lenderMarketDetails.transactions.deposit.button": "Deposit",
    "borrowerMarketDetails.modals.error.tryAgain": "Try again",
  }
  const t = (key: string) => translations[key] || key
  return {
    useTranslation: () => ({ t }),
    Trans: ({ i18nKey }: { i18nKey: string }) => t(i18nKey),
  }
})

let client: QueryClient
let token: Token
let market: Market
let account: MarketAccount
let approveTx: jest.Mock
let depositTx: jest.Mock
let exactDepositTx: jest.Mock
let cappedDepositTx: jest.Mock
const tokenInterface = new utils.Interface([
  "function approve(address spender, uint256 amount)",
])
const marketInterface = new utils.Interface([
  "function deposit(uint256 amount)",
  "function depositUpTo(uint256 amount)",
])
let rerender: () => void

function setup({
  decimals = 6,
  maximum = "100.123456",
  balance = "1000",
  allowance = "1000",
  mobile = false,
  safe = false,
} = {}) {
  mockMobile = mobile
  mockSafeConnected = safe
  token = new Token(
    1,
    "0x0000000000000000000000000000000000000022",
    "Test token",
    "TEST",
    decimals,
    false,
    mockSigner as unknown as Signer,
  )
  approveTx = jest.fn(async (_spender, raw) => ({
    hash: "0xapprove",
    wait: async () => {
      account.underlyingApproval = BigNumber.from(raw)
      return { status: 1 }
    },
  }))
  Reflect.set(token, "_contract", {
    approve: approveTx,
    interface: tokenInterface,
  })
  market = new Market({
    provider: mockSigner,
    chainId: 1,
    version: MarketVersion.V2,
    marketToken: {
      address: "0x0000000000000000000000000000000000000033",
      name: "Test market",
      symbol: "wmTEST",
      decimals,
    },
    borrower: "0x0000000000000000000000000000000000000044",
    underlyingToken: token,
    maxTotalSupply: token.parseAmount(maximum),
    totalSupply: token.getAmount(0),
    annualInterestBips: 1000,
    isClosed: false,
    hooksConfig: {
      kind: HooksKind.OpenTerm,
      flags: { useOnDeposit: false },
      minimumDeposit: token.getAmount(0),
    },
  } as unknown as ConstructorParameters<typeof Market>[0])
  depositTx = jest.fn(async () => ({
    hash: "0xdeposit",
    wait: async () => ({ status: 1 }),
  }))
  exactDepositTx = jest.fn((raw: BigNumber) => depositTx(raw))
  cappedDepositTx = jest.fn((raw: BigNumber) => depositTx(raw))
  Reflect.set(market, "_contract", {
    deposit: exactDepositTx,
    depositUpTo: cappedDepositTx,
    interface: marketInterface,
  })
  account = new MarketAccount({
    market,
    account: mockAddress,
    underlyingBalance: token.parseAmount(balance),
    underlyingApproval: token.parseAmount(allowance).raw,
  } as unknown as ConstructorParameters<typeof MarketAccount>[0])
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </QueryClientProvider>
)
function mount(options: Parameters<typeof setup>[0] = {}) {
  setup(options)
  const tree = () => (
    <DepositModal
      marketAccount={account}
      isMobileOpen={mockMobile}
      setIsMobileOpen={() => undefined}
    />
  )
  const rendered = render(tree(), { wrapper })
  rerender = () => rendered.rerender(tree())
  if (!mockMobile)
    fireEvent.click(screen.getByRole("button", { name: "Deposit" }))
}
const max = () => fireEvent.click(screen.getByRole("button", { name: "Max" }))
const input = () => screen.getByRole("textbox") as HTMLInputElement
const submit = () =>
  fireEvent.click(
    mockMobile
      ? screen.getByRole("button", { name: "Deposit" })
      : within(screen.getByRole("dialog")).getByRole("button", {
          name: "Deposit",
        }),
  )
const setMaximum = (value: string) => {
  market.maxTotalSupply = token.parseAmount(value)
  rerender()
}
const drain = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
  })
}

afterEach(() => {
  cleanup()
  client?.clear()
  jest.clearAllMocks()
  mockMobile = false
  mockSafeConnected = false
  mockConnectedAddress = mockAddress
  mockSigner.getAddress.mockReset().mockResolvedValue(mockAddress)
})

it.each([false, true])(
  "submits the precise Max through depositUpTo (mobile=%s)",
  async (mobile) => {
    mount({ mobile })
    max()
    expect(input().value).toBe("100.12345")
    submit()
    await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
    expect(depositTx.mock.calls[0][0].toString()).toBe("100123456")
    expect(cappedDepositTx).toHaveBeenCalledTimes(1)
    expect(exactDepositTx).not.toHaveBeenCalled()
  },
)
it("clears the exact fill on manual edits and stops following the maximum", async () => {
  mount()
  max()
  fireEvent.change(input(), { target: { value: "5.5" } })
  setMaximum("200")
  expect(input().value).toBe("5.5")
  submit()
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
  expect(depositTx.mock.calls[0][0].toString()).toBe("5500000")
  expect(exactDepositTx).toHaveBeenCalledTimes(1)
  expect(cappedDepositTx).not.toHaveBeenCalled()
})
it("tracks changes below display precision", async () => {
  mount()
  max()
  setMaximum("100.123455")
  expect(input().value).toBe("100.12345")
  submit()
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
  expect(depositTx.mock.calls[0][0].toString()).toBe("100123455")
})
it("limits Max to the wallet balance", async () => {
  mount({ balance: "2.123456" })
  max()
  submit()
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
  expect(depositTx.mock.calls[0][0].toString()).toBe("2123456")
})
it("sends the same exact value in the Safe approval/deposit batch", async () => {
  mockSafeSend.mockResolvedValueOnce({ safeTxHash: "0xsafe" })
  mount({ safe: true, allowance: "0" })
  max()
  submit()
  await waitFor(() => expect(mockSafeSend).toHaveBeenCalledTimes(1))
  const { txs } = mockSafeSend.mock.calls[0][0]
  expect(tokenInterface.parseTransaction(txs[0]).args[1].toString()).toBe(
    "100123456",
  )
  const depositCall = marketInterface.parseTransaction(txs[1])
  expect(depositCall.name).toBe("depositUpTo")
  expect(depositCall.args[0].toString()).toBe("100123456")
})
it("freezes the chosen amount while approving and synchronizes after approval", async () => {
  mount({ allowance: "0" })
  max()
  let finish: () => void = () => undefined
  approveTx.mockImplementationOnce(async () => ({
    hash: "0xapprove",
    wait: () =>
      new Promise((resolve) => {
        finish = () => {
          account.underlyingApproval = token.parseAmount("100.123456").raw
          resolve({ status: 1 })
        }
      }),
  }))
  fireEvent.click(screen.getByRole("button", { name: "Approve" }))
  await waitFor(() => expect(approveTx).toHaveBeenCalledTimes(1))
  setMaximum("50.123456")
  expect(input().value).toBe("100.12345")
  expect(screen.getByRole("button", { name: "Max" })).toBeDisabled()
  await act(async () => finish())
  await drain()
  expect(input().value).toBe("50.12345")
})
it("blocks a Max value below the minimum deposit", async () => {
  mount()
  market.hooksConfig!.minimumDeposit = token.parseAmount("200")
  rerender()
  max()
  await drain()
  expect(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Deposit" }),
  ).toBeDisabled()
})
it.each([false, true])(
  "does not change the amount behind a hidden error screen before retry (mobile=%s)",
  async (mobile) => {
    mount({ maximum: "100", mobile })
    max()
    depositTx.mockRejectedValueOnce(new Error("User rejected transaction"))
    submit()
    await screen.findByRole("button", { name: "Try again" })
    setMaximum("200")
    await drain()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(2))
    expect(depositTx.mock.calls[0][0].toString()).toBe("100000000")
    expect(depositTx.mock.calls[1][0].toString()).toBe("100000000")
    await screen.findByRole("button", { name: "Success close" })
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  },
)
it.each([0, 2, 8, 18])(
  "keeps Max parser-safe with %s token decimals",
  async (decimals) => {
    const value = decimals === 0 ? "1234" : `1234.${"1".repeat(decimals)}`
    mount({ decimals, maximum: value, balance: "10000", allowance: "10000" })
    max()
    submit()
    await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
    expect(depositTx.mock.calls[0][0].toString()).toBe(
      token.parseAmount(value).raw.toString(),
    )
  },
)
it("clears a standing Max when available capacity becomes zero", async () => {
  mount()
  max()
  setMaximum("0")
  expect(input().value).toBe("")
  expect(screen.queryByRole("button", { name: "Max" })).toBeNull()
  expect(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Deposit" }),
  ).toBeDisabled()
})
it("reopening the modal clears the standing Max", async () => {
  mount()
  max()
  fireEvent.keyDown(screen.getByRole("dialog"), {
    key: "Escape",
    code: "Escape",
  })
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  fireEvent.click(screen.getByRole("button", { name: "Deposit" }))
  expect(input().value).toBe("")
})
it("preserves the old retry amount after a manually entered deposit fails", async () => {
  mount({ maximum: "100" })
  fireEvent.change(input(), { target: { value: "100" } })
  depositTx.mockRejectedValueOnce(new Error("User rejected transaction"))
  submit()
  await screen.findByRole("button", { name: "Try again" })
  setMaximum("200")
  await drain()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(2))
  expect(depositTx.mock.calls[1][0].toString()).toBe("100000000")
})

it("keeps the original retry bound when capacity increases during the failed attempt", async () => {
  mount({ maximum: "100" })
  max()
  let fail: (error: Error) => void = () => undefined
  depositTx.mockReturnValueOnce(
    new Promise((_, reject) => {
      fail = reject
    }),
  )
  submit()
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(1))
  setMaximum("200")
  await act(async () => fail(new Error("Transaction rejected")))
  await screen.findByRole("button", { name: "Try again" })
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await waitFor(() => expect(depositTx).toHaveBeenCalledTimes(2))
  expect(cappedDepositTx.mock.calls[1][0].toString()).toBe("100000000")
})

it.each(["account", "market"])(
  "invalidates the retry when the %s changes",
  async (change) => {
    mount({ maximum: "100" })
    max()
    depositTx.mockRejectedValueOnce(new Error("Transaction rejected"))
    submit()
    await screen.findByRole("button", { name: "Try again" })
    if (change === "account")
      mockConnectedAddress = "0x0000000000000000000000000000000000000055"
    else market.address = "0x0000000000000000000000000000000000000066"
    rerender()
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull(),
    )
    expect(depositTx).toHaveBeenCalledTimes(1)
  },
)

it("uses depositUpTo for a Safe with sufficient allowance", async () => {
  mount({ safe: true })
  max()
  submit()
  await waitFor(() => expect(cappedDepositTx).toHaveBeenCalledTimes(1))
  expect(exactDepositTx).not.toHaveBeenCalled()
  expect(mockSafeSend).not.toHaveBeenCalled()
})

it("keeps a manually entered Safe deposit exact", async () => {
  mockSafeSend.mockResolvedValueOnce({ safeTxHash: "0xsafe" })
  mount({ safe: true, allowance: "0" })
  fireEvent.change(input(), { target: { value: "5" } })
  submit()
  await waitFor(() => expect(mockSafeSend).toHaveBeenCalledTimes(1))
  const { txs } = mockSafeSend.mock.calls[0][0]
  expect(marketInterface.parseTransaction(txs[1]).name).toBe("deposit")
})

it("resets a USDT-like Safe allowance before approving the capped amount", async () => {
  mockSafeSend.mockResolvedValueOnce({ safeTxHash: "0xsafe" })
  mount({ safe: true, allowance: "1" })
  token.address = "0xdac17f958d2ee523a2206206994597c13d831ec7"
  max()
  submit()
  await waitFor(() => expect(mockSafeSend).toHaveBeenCalledTimes(1))
  const { txs } = mockSafeSend.mock.calls[0][0]
  expect(txs).toHaveLength(3)
  expect(tokenInterface.parseTransaction(txs[0]).args[1].isZero()).toBe(true)
  expect(tokenInterface.parseTransaction(txs[1]).args[1].toString()).toBe(
    "100123456",
  )
  expect(marketInterface.parseTransaction(txs[2]).name).toBe("depositUpTo")
})

it.each(["capacity", "balance"])(
  "reduces a captured Max to the current %s before sending",
  async (limit) => {
    setup({ maximum: "100" })
    const { result } = renderHook(() => useDeposit(account, () => undefined), {
      wrapper,
    })
    const request = {
      amount: token.parseAmount("100"),
      mode: "maximum" as const,
    }
    if (limit === "capacity") market.maxTotalSupply = token.parseAmount("50")
    else account.underlyingBalance = token.parseAmount("50")
    await act(async () => {
      await result.current.mutateAsync(request)
    })
    expect(cappedDepositTx.mock.calls[0][0].toString()).toBe("50000000")
  },
)

it.each(["zero", "minimum"])(
  "rejects a Safe Max reduced below the %s limit before proposing approval",
  async (limit) => {
    setup({ maximum: "100", allowance: "0", safe: true })
    const { result } = renderHook(() => useDeposit(account, () => undefined), {
      wrapper,
    })
    const request = {
      amount: token.parseAmount("100"),
      mode: "maximum" as const,
    }
    market.maxTotalSupply = token.parseAmount(limit === "zero" ? "0" : "40")
    market.hooksConfig!.minimumDeposit = token.parseAmount("50")
    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toThrow(
        limit === "zero" ? "No amount available" : "below the market minimum",
      )
    })
    expect(mockSafeSend).not.toHaveBeenCalled()
    expect(depositTx).not.toHaveBeenCalled()
  },
)

it("retains the transaction signer check on the direct capped-deposit path", async () => {
  setup()
  Reflect.set(market, "_provider", {
    ...mockSigner,
    getAddress: async () => "0x0000000000000000000000000000000000000055",
  })
  const { result } = renderHook(() => useDeposit(account, () => undefined), {
    wrapper,
  })
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        amount: token.parseAmount("100"),
        mode: "maximum",
      }),
    ).rejects.toThrow("Market signer does not match")
  })
  expect(depositTx).not.toHaveBeenCalled()
})

it("rejects a captured amount for a different asset", async () => {
  setup()
  const other = new Token(
    1,
    "0x0000000000000000000000000000000000000077",
    "Other",
    "OTHER",
    18,
    false,
    mockSigner as unknown as Signer,
  )
  const { result } = renderHook(() => useDeposit(account, () => undefined), {
    wrapper,
  })
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        amount: other.parseAmount("100"),
        mode: "maximum",
      }),
    ).rejects.toThrow("Deposit asset does not match")
  })
  expect(depositTx).not.toHaveBeenCalled()
})
