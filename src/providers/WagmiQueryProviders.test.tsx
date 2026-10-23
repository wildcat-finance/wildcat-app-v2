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
  it("finishes restoration without connecting outside Safe", async () => {
    const { result } = renderHook(useAutoConnect)
    await waitFor(() => expect(result.current).toBe(true))
    expect(connectAsync).not.toHaveBeenCalled()
  })
  it("connects Safe before allowing page content", async () => {
    safe.isAuthorized.mockResolvedValue(true)
    const { result } = renderHook(useAutoConnect)
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
    expect(connectAsync).toHaveBeenCalledWith({ connector: safe })
    expect(injected.disconnect).toHaveBeenCalled()
  })
  it("finishes restoration when Safe cannot connect", async () => {
    safe.isAuthorized.mockResolvedValue(true)
    connectAsync.mockRejectedValue(new Error("unavailable"))
    const { result } = renderHook(useAutoConnect)
    await waitFor(() => expect(result.current).toBe(true))
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
    const { result, unmount } = renderHook(useAutoConnect)
    await waitFor(() => expect(connectAsync).toHaveBeenCalled())
    suppressAutoConnect()
    await act(async () => connected())
    await waitFor(() => expect(result.current).toBe(true))
    expect(disconnect).toHaveBeenCalledWith({}, { connector: safe })
    expect(injected.disconnect).not.toHaveBeenCalled()
    unmount()
    const next = renderHook(useAutoConnect)
    await waitFor(() => expect(next.result.current).toBe(true))
    expect(connectAsync).toHaveBeenCalledTimes(1)
  })
})
