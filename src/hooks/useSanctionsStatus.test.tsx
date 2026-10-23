/* eslint-disable import/no-extraneous-dependencies */
import { act, renderHook } from "@testing-library/react"

import { screenWallet } from "@/lib/sanctions"
import { SanctionsResult } from "@/utils/sanctions"

import { useSanctionsStatus } from "./useSanctionsStatus"

jest.mock("@/lib/sanctions", () => ({ screenWallet: jest.fn() }))
const A = `0x${"a".repeat(40)}`
const B = `0x${"b".repeat(40)}`
const scope = { address: A, chainId: 1, selectedChainId: 1, enabled: true }
const response = (
  status: SanctionsResult["status"] = "clear",
  address = A,
  lifetime = 60_000,
): SanctionsResult => ({
  address,
  status,
  checkedAt: Date.now(),
  validUntil: Date.now() + lifetime,
})
const flush = async () => {
  await act(async () => {})
}
const advance = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}

describe("useSanctionsStatus", () => {
  beforeEach(() => {
    jest.mocked(screenWallet).mockReset()
    jest.useFakeTimers()
    jest.setSystemTime(1_792_720_000_000)
    jest.mocked(screenWallet).mockImplementation(async () => response())
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("screens through the gateway checker and cancels on unmount", async () => {
    const { result, unmount } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    expect(result.current.status).toBe("clear")
    expect(screenWallet).toHaveBeenCalledWith(
      A,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    const signal = jest.mocked(screenWallet).mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
  })
  it("pauses on a gateway error", async () => {
    jest.mocked(screenWallet).mockResolvedValue(response("unavailable"))
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    expect(result.current.status).toBe("unavailable")
  })

  it("starts checking and then clears the matching wallet", async () => {
    const { result } = renderHook(() => useSanctionsStatus(scope))
    expect(result.current.status).toBe("checking")
    await flush()
    expect(result.current.status).toBe("clear")
    expect(screenWallet).toHaveBeenCalledWith(
      A,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
  it("does not screen while disconnected or reconnecting", async () => {
    renderHook(() => useSanctionsStatus({ ...scope, enabled: false }))
    await flush()
    expect(screenWallet).not.toHaveBeenCalled()
  })
  it("does not blink during a successful background refresh", async () => {
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    await advance(45_000)
    expect(screenWallet).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe("clear")
  })
  it("discards clearance on disconnect even when the same wallet reconnects", async () => {
    const { result, rerender } = renderHook(
      (props) => useSanctionsStatus(props),
      { initialProps: scope },
    )
    await flush()
    expect(result.current.status).toBe("clear")
    rerender({ ...scope, enabled: false })
    let resolve!: (value: SanctionsResult) => void
    jest.mocked(screenWallet).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    rerender(scope)
    expect(result.current.status).toBe("checking")
    await act(async () => resolve(response("blocked")))
    expect(result.current.status).toBe("blocked")
  })
  it("expires old clearance when refresh fails and recovers on Retry", async () => {
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    jest.mocked(screenWallet).mockRejectedValue(new Error("offline"))
    await advance(45_000)
    expect(result.current.status).toBe("clear")
    await advance(15_000)
    expect(result.current.status).toBe("unavailable")
    jest.mocked(screenWallet).mockImplementation(async () => response())
    await act(async () => result.current.retry())
    expect(result.current.status).toBe("clear")
  })
  it("retains rejection through a failed refresh and only clears on a valid result", async () => {
    jest
      .mocked(screenWallet)
      .mockImplementation(async () => response("blocked"))
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    expect(result.current.status).toBe("blocked")
    jest.mocked(screenWallet).mockRejectedValue(new Error("offline"))
    await advance(65_000)
    expect(result.current.status).toBe("blocked")
    jest.mocked(screenWallet).mockImplementation(async () => response())
    await act(async () => result.current.retry())
    expect(result.current.status).toBe("clear")
  })
  it.each(["chainId", "selectedChainId"])(
    "screens again when %s changes",
    async (field) => {
      const { result, rerender } = renderHook(
        (props) => useSanctionsStatus(props),
        { initialProps: scope },
      )
      await flush()
      let resolve!: (value: SanctionsResult) => void
      jest.mocked(screenWallet).mockReturnValue(
        new Promise((done) => {
          resolve = done
        }),
      )
      rerender({ ...scope, [field]: 9745 })
      expect(result.current.status).toBe("checking")
      await act(async () => resolve(response("blocked")))
      expect(result.current.status).toBe("blocked")
    },
  )
  it("aborts an old account's request and ignores its late response", async () => {
    let resolveA!: (value: SanctionsResult) => void
    jest
      .mocked(screenWallet)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveA = resolve
        }),
      )
      .mockImplementation(async () => response("blocked", B))
    const { result, rerender } = renderHook(
      (props) => useSanctionsStatus(props),
      { initialProps: scope },
    )
    const signal = jest.mocked(screenWallet).mock.calls[0][1]?.signal
    rerender({ ...scope, address: B })
    await flush()
    expect(signal?.aborted).toBe(true)
    expect(result.current.status).toBe("blocked")
    await act(async () => resolveA(response()))
    expect(result.current.status).toBe("blocked")
  })
  it.each(["unavailable", "mismatched", "expired"])(
    "handles %s responses without clearing",
    async (kind) => {
      jest
        .mocked(screenWallet)
        .mockResolvedValue(
          response(
            kind === "unavailable" ? "unavailable" : "clear",
            kind === "mismatched" ? B : A,
            kind === "expired" ? 0 : 60_000,
          ),
        )
      const { result } = renderHook(() => useSanctionsStatus(scope))
      await flush()
      expect(result.current.status).toBe("unavailable")
    },
  )
  it("expires clearance at a shorter source freshness deadline", async () => {
    jest.mocked(screenWallet).mockResolvedValue(response("clear", A, 5000))
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await flush()
    expect(result.current.status).toBe("clear")
    await advance(5000)
    expect(result.current.status).toBe("unavailable")
  })
  it("times out and offers recovery for a hanging request", async () => {
    jest.mocked(screenWallet).mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new Error("timeout")),
          )
        }),
    )
    const { result } = renderHook(() => useSanctionsStatus(scope))
    await advance(10_000)
    expect(result.current.status).toBe("unavailable")
  })
  it("rechecks when the tab receives focus", async () => {
    renderHook(() => useSanctionsStatus(scope))
    await flush()
    await act(async () => {
      window.dispatchEvent(new Event("focus"))
    })
    expect(screenWallet).toHaveBeenCalledTimes(2)
  })
})
