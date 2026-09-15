/* eslint-disable import/no-extraneous-dependencies */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  Market,
  MarketAccount,
  MarketVersion,
  QueueWithdrawalStatus,
  RAY,
  SignerOrProvider,
  SupportedChainId,
  Token,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"
import { I18nextProvider } from "react-i18next"

import type { useWithdrawRouting } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawRouting"
import initTranslations from "@/app/i18n"
import en from "@/locales/en/en.json"

import { WithdrawModal } from "."

const begin = jest.fn()
let mockIsMobile = false
let mockRouting: ReturnType<typeof useWithdrawRouting>

jest.mock("wagmi", () => ({}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => mockIsMobile,
}))
jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: () => ({ getTxUrl: () => "", getAddressUrl: () => "" }),
}))
jest.mock(
  "@/app/[locale]/lender/market/[address]/hooks/useWithdrawRouting",
  () => ({ useWithdrawRouting: () => mockRouting }),
)
jest.mock(
  "@/app/[locale]/lender/market/[address]/hooks/useWithdrawFlow",
  () => ({
    ...jest.requireActual(
      "@/app/[locale]/lender/market/[address]/hooks/useWithdrawFlow",
    ),
    useWithdrawFlow: () => ({
      legs: [],
      reset: jest.fn(),
      begin,
      isBatched: false,
    }),
  }),
)
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: ({ crossOnClick }: { crossOnClick: () => void }) => (
    <button type="button" onClick={crossOnClick}>
      Close
    </button>
  ),
}))
jest.mock("@/components/Mobile/TransactionHeader", () => ({
  TransactionHeader: () => null,
}))

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "USD Coin",
  "USDC",
  6,
  false,
  {} as SignerOrProvider,
)
const expiry = Math.floor(Date.now() / 1000) + 3_600
const makeAccount = () =>
  ({
    market: {
      address: "0x0000000000000000000000000000000000000002",
      chainId: SupportedChainId.Sepolia,
      version: MarketVersion.V2,
      eventGeneration: "legacy",
      isClosed: false,
      pendingWithdrawalExpiry: 0,
      withdrawalBatchDuration: 10_800,
      scaleFactor: 2n * RAY,
      underlyingToken: token,
      update: jest.fn().mockResolvedValue(undefined),
    },
    withdrawalAvailability: QueueWithdrawalStatus.Ready,
    scaledMarketBalance: 100_000_000n,
  }) as unknown as MarketAccount

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const mountModal = async (account = makeAccount()) => {
  const { i18n } = await initTranslations("en", ["en"], undefined, {
    en: { en },
  })
  const queryClient = new QueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <WithdrawModal marketAccount={account} isMobileOpen={mockIsMobile} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
  if (!mockIsMobile)
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }))
  return { ...view, account }
}

const confirmButton = () =>
  screen.getByRole("button", { name: /Withdraw 200 USDC/ })

beforeEach(() => {
  begin.mockClear()
  mockIsMobile = false
  const amount = token.getAmount(200_000_000n)
  const zero = token.getAmount(0)
  mockRouting = {
    route: {
      amount,
      fromDirect: amount,
      fromWrapped: zero,
      usesWrapped: false,
    },
    amountInput: "200",
    handleAmountChange: jest.fn(),
    direct: amount,
    maxForMode: amount,
    dustFloor: token.parseAmount("0.00001"),
    isValid: true,
    reset: jest.fn(),
  } as unknown as ReturnType<typeof useWithdrawRouting>
})

afterEach(() => jest.restoreAllMocks())

describe("withdrawal batch check presentation", () => {
  it("keeps the form and dialog height stable during discovery and confirmation", async () => {
    const account = makeAccount()
    const initialRead = deferred()
    const update = account.market.update as jest.Mock
    update.mockReturnValueOnce(initialRead.promise)
    const { unmount } = await mountModal(account)

    const dialog = screen.getByRole("dialog")
    expect(window.getComputedStyle(dialog).height).toBe("493px")
    expect(screen.queryByRole("note")).toBeNull()
    expect(
      (
        screen.getByRole("button", {
          name: "Checking Current Batch…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)

    await act(async () => initialRead.resolve())
    await waitFor(() =>
      expect((confirmButton() as HTMLButtonElement).disabled).toBe(false),
    )

    const finalRead = deferred()
    update.mockReturnValueOnce(finalRead.promise)
    fireEvent.click(confirmButton())
    await screen.findByRole("button", { name: "Checking Current Batch…" })
    expect(window.getComputedStyle(dialog).height).toBe("493px")
    expect(screen.queryByRole("note")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    expect(begin).not.toHaveBeenCalled()

    await act(async () => finalRead.resolve())
    await waitFor(() => expect(begin).toHaveBeenCalledWith(mockRouting.route))
    expect(begin).toHaveBeenCalledTimes(1)
    expect(window.getComputedStyle(dialog).height).toBe("493px")
    unmount()
  })

  it.each(["loss", "failure"])(
    "pauses confirmation to show a new %s until acknowledged",
    async (outcome) => {
      const { account, unmount } = await mountModal()
      await waitFor(() =>
        expect((confirmButton() as HTMLButtonElement).disabled).toBe(false),
      )
      const update = account.market.update as jest.Mock
      if (outcome === "failure") {
        update.mockRejectedValue(new Error("RPC unavailable"))
      } else {
        update.mockImplementation(async function read(this: Market) {
          this.pendingWithdrawalExpiry = expiry
        })
        jest.spyOn(WithdrawalBatch, "getWithdrawalBatch").mockResolvedValue({
          expiry,
          scaledTotalAmount: 100_000_000n,
          normalizedTotalAmount: token.getAmount(100_000_000n),
        } as WithdrawalBatch)
      }

      fireEvent.click(confirmButton())
      const warning = await screen.findByRole("note")
      expect(warning.textContent).toContain(
        outcome === "loss"
          ? "150 USDC"
          : "Unable to verify withdrawal batch pricing",
      )
      expect(begin).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole("button", { name: /Withdraw Anyway/ }))
      expect(begin).toHaveBeenCalledTimes(1)
      unmount()
    },
  )

  it("does not start a transaction when the modal closes during confirmation", async () => {
    const { account, unmount } = await mountModal()
    await waitFor(() =>
      expect((confirmButton() as HTMLButtonElement).disabled).toBe(false),
    )
    const read = deferred()
    const update = account.market.update as jest.Mock
    update.mockReturnValueOnce(read.promise)
    fireEvent.click(confirmButton())
    await screen.findByRole("button", { name: "Checking Current Batch…" })
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    await act(async () => read.resolve())
    expect(begin).not.toHaveBeenCalled()
    unmount()
  })

  it("keeps the mobile form free of a checking alert", async () => {
    mockIsMobile = true
    const account = makeAccount()
    const read = deferred()
    const update = account.market.update as jest.Mock
    update.mockReturnValueOnce(read.promise)
    const { unmount } = await mountModal(account)

    expect(
      (
        screen.getByRole("button", {
          name: "Checking Current Batch…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(screen.queryByRole("note")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    await act(async () => read.resolve())
    await waitFor(() =>
      expect((confirmButton() as HTMLButtonElement).disabled).toBe(false),
    )
    unmount()
  })
})
