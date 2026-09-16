/* eslint-disable import/no-extraneous-dependencies */
// Actual modal/flows, SDK preview, transaction hooks and English copy.
// Wallet/RPC transports and unrelated leaf UI are simulated.
import React from "react"

import { ThemeProvider } from "@mui/material"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import {
  CloseMarketStatus,
  HooksKind,
  Market,
  MarketAccount,
  MarketVersion,
  Signer,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber, utils } from "ethers"
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"

import { TerminateMarket } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket"
import english from "@/locales/en/en.json"
import { theme } from "@/theme/theme"

const mockBorrower = "0x0000000000000000000000000000000000000011"
let mockChainId = 1
let mockAddress = mockBorrower
const mockSigner = {
  _isSigner: true,
  get chainId() {
    return mockChainId
  },
  getAddress: async () => mockAddress,
}
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
jest.mock("wagmi", () => ({ useAccount: () => ({ address: mockAddress }) }))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => mockSigner,
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ targetChainId: mockChainId }),
}))
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false, sdk: {}, safe: {} }),
}))
jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: () => ({
    getTxUrl: (hash: string) => `https://example.test/tx/${hash}`,
    getAddressUrl: (address: string) =>
      `https://example.test/address/${address}`,
  }),
}))
jest.mock("@/components/Toasts", () => ({
  toastRequest: (promise: Promise<unknown>) => promise,
}))
jest.mock("@/components/TooltipButton", () => ({ TooltipButton: () => null }))
jest.mock("@/components/LinkComponent", () => ({
  LinkGroup: ({ linkValue }: { linkValue: string }) => <span>{linkValue}</span>,
}))
jest.mock(
  "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals",
  () => ({
    useGetWithdrawals: () => ({ data: { unpaid: [] } }),
  }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal",
  () => ({
    LoadingModal: ({ txHash }: { txHash: string }) => (
      <div>Pending {txHash}</div>
    ),
  }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal",
  () => ({
    SuccessModal: ({ onClose }: { onClose: () => void }) => (
      <button onClick={onClose}>Success close</button>
    ),
  }),
)

const NOW = Date.UTC(2026, 8, 9, 12) / 1000
const END = Date.UTC(2026, 8, 10) / 1000
const i18n = createInstance()
let nowSpy: jest.SpyInstance
let client: QueryClient
let token: Token
let market: Market
let account: MarketAccount
let rerender: () => void
let closeTx: jest.Mock
let approveTx: jest.Mock

beforeAll(async () => {
  await i18n.init({
    lng: "en",
    resources: { en: { translation: english } },
    interpolation: { escapeValue: false },
  })
})
beforeEach(() => {
  nowSpy = jest.spyOn(Date, "now").mockReturnValue(NOW * 1000)
})
afterEach(() => {
  cleanup()
  client?.clear()
  jest.restoreAllMocks()
  mockChainId = 1
  mockAddress = mockBorrower
})

function mount({
  chainId = 1,
  debt = "0",
  fixed = true,
  allowTermReduction = false,
  allowClosureBeforeTerm = false,
  end = END,
  balance = "1000",
  allowance = "1000",
  nonBorrower = false,
  v1 = false,
  unpaid = false,
  closed = false,
} = {}) {
  mockChainId = chainId
  if (nonBorrower) mockAddress = "0x0000000000000000000000000000000000000055"
  token = new Token(
    chainId,
    "0x0000000000000000000000000000000000000022",
    "Token",
    "TEST",
    6,
    false,
    mockSigner as unknown as Signer,
  )
  market = new Market({
    chainId,
    provider: mockSigner,
    version: v1 ? MarketVersion.V1 : MarketVersion.V2,
    marketToken: {
      address: "0x0000000000000000000000000000000000000033",
      name: "Market",
      symbol: "wmTEST",
      decimals: 6,
    },
    borrower: mockBorrower,
    underlyingToken: token,
    totalSupply: token.parseAmount("100"),
    totalAssets: token.parseAmount("100").sub(token.parseAmount(debt)),
    normalizedUnclaimedWithdrawals: token.getAmount(0),
    lastAccruedProtocolFees: token.getAmount(0),
    scaledPendingWithdrawals: BigNumber.from(0),
    scaleFactor: utils.parseUnits("1", 27),
    annualInterestBips: 1000,
    protocolFeeBips: 100,
    delinquencyFeeBips: 1000,
    timeDelinquent: 0,
    delinquencyGracePeriod: 3600,
    unpaidWithdrawalBatchExpiries: unpaid ? [NOW - 100] : [],
    isClosed: closed,
    hooksConfig: {
      kind: fixed ? HooksKind.FixedTerm : HooksKind.OpenTerm,
      fixedTermEndTime: end,
      allowTermReduction,
      allowClosureBeforeTerm,
    },
  } as unknown as ConstructorParameters<typeof Market>[0])
  closeTx = jest.fn(async () => ({
    hash: "0xclose",
    wait: async () => ({ status: 1 }),
  }))
  Reflect.set(market, "_contract", { closeMarket: closeTx })
  account = new MarketAccount({
    market,
    account: mockAddress,
    underlyingBalance: token.parseAmount(balance),
    underlyingApproval: token.parseAmount(allowance).raw,
  } as unknown as ConstructorParameters<typeof MarketAccount>[0])
  approveTx = jest.fn(async (_spender: string, value: BigNumber) => {
    account.underlyingApproval = value
    return { hash: "0xapprove", wait: async () => ({ status: 1 }) }
  })
  Reflect.set(token, "_contract", { approve: approveTx })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const tree = () => (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <TerminateMarket marketAccount={account} />
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
  const result = render(tree())
  rerender = () => result.rerender(tree())
}

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "Terminate Market" }))
const blocked = () => screen.queryByText("Market cannot be terminated early")
const dialog = () => within(screen.getByRole("dialog"))
const flush = async () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
  })

it.each([1, 11155111, 9745])(
  "shows the actual early-closure reason on chain %s",
  (chainId) => {
    mount({ chainId })
    expect(account.previewCloseMarket().status).toBe(
      CloseMarketStatus.EarlyClosureNotAllowed,
    )
    open()
    expect(blocked()).toBeInTheDocument()
    expect(
      screen.getByText("Fixed term maturity: September 10, 2026"),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Repay and Terminate" }),
    ).toBeNull()
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled()
    expect(closeTx).not.toHaveBeenCalled()
    expect(approveTx).not.toHaveBeenCalled()
  },
)

it("explains the term restriction before discussing debt or balance", () => {
  mount({ debt: "100", balance: "0", allowance: "0" })
  open()
  expect(blocked()).toBeInTheDocument()
  expect(screen.queryByText("Debts")).toBeNull()
  expect(screen.queryByRole("button", { name: "Approve" })).toBeNull()
})

it("gives a non-borrower the correct explanation and closes normally", async () => {
  mount({ nonBorrower: true })
  expect(account.previewCloseMarket().status).toBe(
    CloseMarketStatus.NotBorrower,
  )
  open()
  expect(
    screen.getByText("Only the market's borrower can terminate this market."),
  ).toBeInTheDocument()
  expect(blocked()).toBeNull()
  expect(screen.queryByText(/Fixed term maturity:/)).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Close" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  expect(closeTx).not.toHaveBeenCalled()
})

it.each([{ end: NOW - 1 }, { fixed: false }])(
  "allows an eligible zero-debt market to terminate: %j",
  async (options) => {
    mount(options)
    expect(account.previewCloseMarket().status).toBe(CloseMarketStatus.Ready)
    open()
    expect(blocked()).toBeNull()
    fireEvent.click(dialog().getByRole("button", { name: "Terminate Market" }))
    await screen.findByRole("button", { name: "Success close" })
    expect(closeTx).toHaveBeenCalledTimes(1)
  },
)

it.each([1, 11155111, 9745])(
  "honours explicit early closure on chain %s",
  (chainId) => {
    mount({ chainId, allowClosureBeforeTerm: true })
    expect(account.previewCloseMarket().status).toBe(CloseMarketStatus.Ready)
    open()
    expect(blocked()).toBeNull()
    expect(
      dialog().getByRole("button", { name: "Terminate Market" }),
    ).toBeEnabled()
  },
)

it.each([1, 9745])(
  "does not falsely block term reduction on chain %s",
  (chainId) => {
    mount({ chainId, allowTermReduction: true })
    expect(account.previewCloseMarket().status).toBe(CloseMarketStatus.Ready)
    open()
    expect(blocked()).toBeNull()
    expect(
      dialog().getByRole("button", { name: "Terminate Market" }),
    ).toBeEnabled()
  },
)

it("shows the Adjust Maturity hint for the SDK's Sepolia restriction", () => {
  mount({ chainId: 11155111, allowTermReduction: true })
  expect(account.previewCloseMarket().status).toBe(
    CloseMarketStatus.EarlyClosureNotAllowed,
  )
  open()
  expect(blocked()).toBeInTheDocument()
  expect(
    screen.getByText(/You can bring the maturity forward with Adjust Maturity/),
  ).toBeInTheDocument()
})

it.each([
  { balance: "0", status: CloseMarketStatus.InsufficientBalance },
  { allowance: "0", status: CloseMarketStatus.InsufficientAllowance },
  { v1: true, unpaid: true, status: CloseMarketStatus.UnpaidWithdrawalBatches },
])(
  "keeps existing repayment handling for $status",
  ({ status, ...options }) => {
    mount({ debt: "50", fixed: false, ...options })
    expect(account.previewCloseMarket().status).toBe(status)
    open()
    expect(
      screen.getByRole("button", { name: "Repay and Terminate" }),
    ).toBeDisabled()
    expect(blocked()).toBeNull()
  },
)

it.each([false, true])(
  "keeps the repayment flow and approval hash when debt reaches zero (initiallyBlocked=%s)",
  async (initiallyBlocked) => {
    mount({ debt: "50", fixed: initiallyBlocked, allowance: "0" })
    open()
    if (initiallyBlocked) {
      expect(blocked()).toBeInTheDocument()
      nowSpy.mockReturnValue((END + 1) * 1000)
      rerender()
      await flush()
    }
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    await screen.findByText("https://example.test/tx/0xapprove")
    market.totalAssets = market.totalDebts
    rerender()
    await flush()
    expect(market.outstandingDebt.eq(0)).toBe(true)
    expect(
      screen.getByRole("button", { name: "Repay and Terminate" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("https://example.test/tx/0xapprove"),
    ).toBeInTheDocument()
    expect(closeTx).not.toHaveBeenCalled()
  },
)

it("updates the maturity details while closure remains blocked", () => {
  mount({ chainId: 11155111, allowTermReduction: true })
  open()
  Object.assign(market.hooksConfig!, { fixedTermEndTime: NOW + 3600 })
  rerender()
  expect(account.previewCloseMarket().status).toBe(
    CloseMarketStatus.EarlyClosureNotAllowed,
  )
  expect(blocked()).toBeInTheDocument()
  expect(
    screen.getByText("Fixed term maturity: September 09, 2026"),
  ).toBeInTheDocument()
  expect(
    screen.queryByText("Fixed term maturity: September 10, 2026"),
  ).toBeNull()
})

it("preserves the pending transaction view when refreshed debt reaches zero", async () => {
  mount({ debt: "50", fixed: false })
  let finish!: () => void
  closeTx.mockResolvedValueOnce({
    hash: "0xclose",
    wait: () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  })
  open()
  fireEvent.click(screen.getByRole("button", { name: "Repay and Terminate" }))
  const pendingView = await screen.findByText("Pending 0xclose")
  market.totalAssets = market.totalDebts
  rerender()
  await flush()
  expect(screen.getByText("Pending 0xclose")).toBe(pendingView)
  expect(closeTx).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  await screen.findByRole("button", { name: "Success close" })
})

it("chooses the current transaction flow when reopening", async () => {
  mount({ debt: "50", fixed: false })
  open()
  expect(
    screen.getByRole("button", { name: "Repay and Terminate" }),
  ).toBeEnabled()
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  market.totalAssets = market.totalDebts
  rerender()
  open()
  expect(
    dialog().getByRole("button", { name: "Terminate Market" }),
  ).toBeEnabled()
  expect(
    screen.queryByRole("button", { name: "Repay and Terminate" }),
  ).toBeNull()
})

it("does not offer termination for a closed market", () => {
  mount({ closed: true })
  expect(screen.queryByRole("button", { name: "Terminate Market" })).toBeNull()
})

it("reopening after maturity refreshes the blocked decision", async () => {
  mount()
  open()
  expect(blocked()).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Close" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  nowSpy.mockReturnValue((END + 1) * 1000)
  rerender()
  open()
  expect(blocked()).toBeNull()
  expect(
    dialog().getByRole("button", { name: "Terminate Market" }),
  ).toBeEnabled()
})

it.each(["maturity", "term reduction"])(
  "removes the blocked view when %s makes closure available while open",
  async (change) => {
    mount({
      chainId: change === "maturity" ? 1 : 11155111,
      allowTermReduction: change === "term reduction",
    })
    open()
    expect(blocked()).toBeInTheDocument()
    if (change === "maturity") nowSpy.mockReturnValue((END + 1) * 1000)
    else Object.assign(market.hooksConfig!, { fixedTermEndTime: NOW - 1 })
    rerender()
    await flush()
    expect(account.previewCloseMarket().status).toBe(CloseMarketStatus.Ready)
    expect(blocked()).toBeNull()
    expect(
      dialog().getByRole("button", { name: "Terminate Market" }),
    ).toBeEnabled()
  },
)
