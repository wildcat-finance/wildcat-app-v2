/* eslint-disable import/no-extraneous-dependencies */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen } from "@testing-library/react"

import { screenWallet } from "@/lib/sanctions"
import { suppressAutoConnect } from "@/providers/WagmiQueryProviders"
import { SanctionsResult } from "@/utils/sanctions"
import {
  assertSanctionsAccess,
  clearSanctionsAccess,
} from "@/utils/sanctionsAccess"

import { SanctionsGate } from "."

const ADDRESS = `0x${"a".repeat(40)}`
let wallet = {
  address: ADDRESS as string | undefined,
  chainId: 1,
  status: "connected",
}
const disconnect = jest.fn()
const store = { getState: () => ({ selectedNetwork: { chainId: 1 } }) }
jest.mock("@/lib/sanctions", () => ({ screenWallet: jest.fn() }))
jest.mock("wagmi", () => ({
  useAccount: () => wallet,
  useDisconnect: () => ({ disconnectAsync: disconnect, isPending: false }),
}))
jest.mock("wagmi/actions", () => ({ getAccount: () => wallet }))
jest.mock("@/lib/config", () => ({ config: {} }))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))
jest.mock("@/store/hooks", () => ({ useAppStore: () => store }))
jest.mock("@/providers/WagmiQueryProviders", () => ({
  suppressAutoConnect: jest.fn(),
}))
jest.mock(
  "@/assets/icons/logo_black.svg",
  () =>
    function Logo() {
      return <span>Wildcat</span>
    },
)

const content = (
  <SanctionsGate>
    <button type="button">Deposit</button>
    <div>Market page</div>
  </SanctionsGate>
)
const respond = (status: SanctionsResult["status"]) => {
  jest.mocked(screenWallet).mockImplementation(async () => ({
    address: ADDRESS,
    status,
    checkedAt: Date.now(),
    validUntil: Date.now() + 60_000,
  }))
}

describe("global sanctions gate", () => {
  beforeEach(() => {
    wallet = { address: ADDRESS, chainId: 1, status: "connected" }
    jest.clearAllMocks()
    respond("blocked")
  })
  afterEach(() => {
    clearSanctionsAccess()
  })
  it("shows the page while checking, then offers only disconnect for a flagged wallet", async () => {
    render(content)
    expect(screen.getByText("Market page")).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Wallet access restricted" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Market page")).not.toBeInTheDocument()
    expect(screen.getByText(ADDRESS)).toBeInTheDocument()
    expect(
      screen.getByText(/contact@thewildcat.foundation/),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(
      screen.queryByRole("button", { name: "Deposit" }),
    ).not.toBeInTheDocument()
    await expect(assertSanctionsAccess(ADDRESS, 1)).rejects.toThrow(
      "sanctions screening",
    )
  })
  it.each(["clear", "unavailable"] as const)(
    "keeps the page for a %s result",
    async (status) => {
      respond(status)
      render(content)
      await act(async () => {})
      expect(screenWallet).toHaveBeenCalled()
      expect(screen.getByText("Market page")).toBeInTheDocument()
      expect(screen.queryByRole("heading")).not.toBeInTheDocument()
      await expect(assertSanctionsAccess(ADDRESS, 1)).resolves.toBeUndefined()
    },
  )
  it("disconnects without reloading and suppresses pending Safe auto-connect", async () => {
    const { rerender } = render(content)
    await screen.findByRole("heading", { name: "Wallet access restricted" })
    disconnect.mockImplementation(async () => {
      wallet = { ...wallet, address: undefined, status: "disconnected" }
    })
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Disconnect wallet" }),
      ),
    )
    rerender(
      <SanctionsGate>
        <button type="button">Deposit</button>
        <div>Market page</div>
      </SanctionsGate>,
    )
    expect(screen.getByText("Market page")).toBeInTheDocument()
    expect(suppressAutoConnect).toHaveBeenCalled()
  })
  it("keeps the screen in place when wallet disconnection fails", async () => {
    disconnect.mockRejectedValue(new Error("wallet refused"))
    render(content)
    await screen.findByRole("heading", { name: "Wallet access restricted" })
    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t disconnect",
    )
    expect(screen.queryByText("Market page")).not.toBeInTheDocument()
  })
  it("shows pages during session restoration without screening", () => {
    wallet.status = "reconnecting"
    render(content)
    expect(screen.getByText("Market page")).toBeInTheDocument()
    expect(screenWallet).not.toHaveBeenCalled()
  })
})
