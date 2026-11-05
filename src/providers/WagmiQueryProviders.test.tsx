/* eslint-disable import/no-extraneous-dependencies */
import { act, renderHook, waitFor } from "@testing-library/react"
import { disconnect } from "wagmi/actions"

import { suppressAutoConnect, useAutoConnect } from "./WagmiQueryProviders"

const safe = { id: "safe", isAuthorized: jest.fn() }
const injected = { id: "injected", disconnect: jest.fn() }
const connectors = [safe, injected]
const connectAsync = jest.fn()
jest.mock("wagmi", () => ({
  useConnect: () => ({ connectors, connectAsync }),
}))
jest.mock("wagmi/actions", () => ({ disconnect: jest.fn() }))
jest.mock("@/lib/config", () => ({ config: {} }))

describe("Safe wallet startup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    safe.isAuthorized.mockResolvedValue(false)
    connectAsync.mockResolvedValue(undefined)
  })
  it("does not connect outside Safe", async () => {
    renderHook(useAutoConnect)
    await waitFor(() => expect(safe.isAuthorized).toHaveBeenCalled())
    await act(async () => {})
    expect(connectAsync).not.toHaveBeenCalled()
  })
  it("connects Safe and disconnects other connectors", async () => {
    safe.isAuthorized.mockResolvedValue(true)
    renderHook(useAutoConnect)
    await waitFor(() => expect(injected.disconnect).toHaveBeenCalled())
    expect(connectAsync).toHaveBeenCalledWith({ connector: safe })
  })
  it("tolerates a Safe that cannot connect", async () => {
    safe.isAuthorized.mockResolvedValue(true)
    connectAsync.mockRejectedValue(new Error("unavailable"))
    renderHook(useAutoConnect)
    await waitFor(() => expect(connectAsync).toHaveBeenCalled())
    await act(async () => {})
    expect(injected.disconnect).not.toHaveBeenCalled()
  })
  it("does not start a connection after its effect is cleaned up", async () => {
    let authorize!: (value: boolean) => void
    safe.isAuthorized.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          authorize = resolve
        }),
    )
    const { unmount } = renderHook(useAutoConnect)
    unmount()
    await act(async () => authorize(true))
    expect(connectAsync).not.toHaveBeenCalled()
  })
  // Suppression lasts for the browser session; keep this case last.
  it("disconnects a pending Safe connection and prevents automatic reconnection", async () => {
    safe.isAuthorized.mockResolvedValue(true)
    let connected!: () => void
    connectAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          connected = resolve
        }),
    )
    const { unmount } = renderHook(useAutoConnect)
    await waitFor(() => expect(connectAsync).toHaveBeenCalled())
    suppressAutoConnect()
    await act(async () => connected())
    await waitFor(() =>
      expect(disconnect).toHaveBeenCalledWith({}, { connector: safe }),
    )
    expect(injected.disconnect).not.toHaveBeenCalled()
    unmount()
    renderHook(useAutoConnect)
    await act(async () => {})
    expect(connectAsync).toHaveBeenCalledTimes(1)
  })
})
