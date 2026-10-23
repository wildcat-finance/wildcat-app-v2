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
  WalletStartupContext: jest.requireActual("react").createContext(true),
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
  it("mounts no page while checking and offers only disconnect for a flagged wallet", async () => {
    render(content)
    expect(screen.queryByText("Market page")).not.toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Wallet access restricted" }),
    ).toBeInTheDocument()
    expect(screen.getByText(ADDRESS)).toBeInTheDocument()
    expect(
      screen.getByText(/contact@thewildcat.foundation/),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(
      screen.queryByRole("button", { name: "Deposit" }),
    ).not.toBeInTheDocument()
    expect(() => assertSanctionsAccess(ADDRESS, 1)).toThrow()
  })
  it("offers Retry for outages and restores the page when the retry clears", async () => {
    respond("unavailable")
    render(content)
    expect(
      await screen.findByRole("heading", {
        name: "Wallet screening unavailable",
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(2)
    respond("clear")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText("Market page")).toBeInTheDocument()
    expect(() => assertSanctionsAccess(ADDRESS, 1)).not.toThrow()
  })
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
    expect(() => assertSanctionsAccess(ADDRESS, 1)).toThrow()
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
  it("does not show pages during session restoration", () => {
    wallet.status = "reconnecting"
    render(content)
    expect(
      screen.getByRole("heading", { name: "Checking wallet access…" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Market page")).not.toBeInTheDocument()
    expect(screenWallet).not.toHaveBeenCalled()
  })
})
