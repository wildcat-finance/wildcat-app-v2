/** @jest-environment node */
/* eslint-disable no-underscore-dangle */
import { screenWallet } from "@/lib/sanctions"

const ADDRESS = "0x00000001101455bd9d013b53a7a6bdc866d216c8"
const NOW = 1_792_720_000_000
const seconds = NOW / 1000
const fixture = (isSanctioned: boolean | null = false) => ({
  data: {
    _meta: {
      deployment: "QmV4rcuTiHaqqxxwYXNByYy17LfYuCA7TTRW7nydRTC4b6",
      hasIndexingErrors: false,
      block: {
        number: 26_252_000,
        hash: `0x${"a".repeat(64)}`,
        timestamp: seconds - 20,
      },
    },
    sanctionsList: {
      id: "redstone-mainnet",
      chainId: "1",
      oracleAddress: "0x574ad490fe8087b580db227a8ca7efb7c19dc8c4",
      implementation: "0x0e89f02febddf91dd0e61be9b0fb4a5b55a914d5",
      activeCount: "137",
      knownAddressCount: "140",
      updateSequence: "12",
      lastUpdateBlock: "26200000",
      lastUpdateTimestamp: String(seconds - 86_400),
    },
    sanctionedAccount:
      isSanctioned === null
        ? null
        : {
            id: `redstone-mainnet:${ADDRESS}`,
            address: ADDRESS,
            isSanctioned,
            list: { id: "redstone-mainnet" },
          },
  },
})

describe("gateway sanctions screening", () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test" }
    Object.keys(process.env)
      .filter((key) => key.startsWith("NEXT_PUBLIC_SANCTIONS_"))
      .forEach((key) => {
        delete process.env[key]
      })
    jest.spyOn(Date, "now").mockReturnValue(NOW)
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => fixture() })
  })
  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
    jest.useRealTimers()
  })
  const respond = (body: unknown) => {
    jest
      .mocked(fetch)
      .mockResolvedValue({ ok: true, json: async () => body } as Response)
  }

  it.each([true, false, null])(
    "reads current membership %s after validating the feed",
    async (flag) => {
      respond(fixture(flag))
      expect(
        await screenWallet(ADDRESS.toUpperCase().replace("0X", "0x")),
      ).toEqual({
        address: ADDRESS,
        status: flag ? "blocked" : "clear",
        checkedAt: NOW,
        validUntil: NOW + 60_000,
      })
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("mainnet-sanctions/v0.1.0"),
        expect.objectContaining({
          cache: "default",
          method: "POST",
          body: expect.stringContaining(`redstone-mainnet:${ADDRESS}`),
        }),
      )
    },
  )

  it.each([
    [
      "stale index",
      (f: ReturnType<typeof fixture>) => {
        f.data._meta.block.timestamp = seconds - 901
      },
    ],
    [
      "stale list",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.lastUpdateTimestamp = String(
          seconds - 10 * 86_400 - 1,
        )
      },
    ],
    [
      "wrong deployment",
      (f: ReturnType<typeof fixture>) => {
        f.data._meta.deployment = "other"
      },
    ],
    [
      "index error",
      (f: ReturnType<typeof fixture>) => {
        f.data._meta.hasIndexingErrors = true
      },
    ],
    [
      "wrong source",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.oracleAddress = ADDRESS
      },
    ],
    [
      "unknown implementation",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.implementation = ADDRESS
      },
    ],
    [
      "wrong chain",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.chainId = "9745"
      },
    ],
    [
      "uninitialized list",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.updateSequence = "0"
      },
    ],
    [
      "future index",
      (f: ReturnType<typeof fixture>) => {
        f.data._meta.block.timestamp = seconds + 61
      },
    ],
    [
      "future update",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.lastUpdateTimestamp = String(seconds)
      },
    ],
    [
      "inconsistent counts",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionsList.knownAddressCount = "0"
      },
    ],
    [
      "wrong account",
      (f: ReturnType<typeof fixture>) => {
        f.data.sanctionedAccount!.address = `0x${"b".repeat(40)}`
      },
    ],
  ] as const)("does not clear a wallet with %s", async (_, change) => {
    const body = fixture()
    change(body)
    respond(body)
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
  })

  it.each([
    {},
    { data: null },
    { ...fixture(), errors: [{ message: "partial data" }] },
  ])("rejects missing/partial GraphQL data", async (body) => {
    respond(body)
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
  })
  it("does not extend clearance beyond the source freshness deadline", async () => {
    const body = fixture()
    body.data.sanctionsList.lastUpdateTimestamp = String(
      seconds - 10 * 86_400 + 5,
    )
    respond(body)
    expect((await screenWallet(ADDRESS)).validUntil).toBe(NOW + 5_000)
  })
  it("uses configured freshness limits", async () => {
    process.env.NEXT_PUBLIC_SANCTIONS_MAX_LIST_AGE_SECONDS = "60"
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
  })
  it("fails closed on an invalid freshness setting", async () => {
    process.env.NEXT_PUBLIC_SANCTIONS_MAX_INDEX_AGE_SECONDS = "NaN"
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
    expect(fetch).not.toHaveBeenCalled()
  })
  it("handles HTTP and network failures", async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockRejectedValueOnce(new Error("offline"))
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
  })
  it("fetches changed membership and rejects stale data on repeated checks", async () => {
    expect((await screenWallet(ADDRESS)).status).toBe("clear")
    respond(fixture(true))
    expect((await screenWallet(ADDRESS)).status).toBe("blocked")
    const stale = fixture(false)
    stale.data._meta.block.timestamp = seconds - 901
    respond(stale)
    expect((await screenWallet(ADDRESS)).status).toBe("unavailable")
    expect(fetch).toHaveBeenCalledTimes(3)
    jest.mocked(fetch).mock.calls.forEach(([, options]) => {
      expect(options).toEqual(
        expect.objectContaining({ method: "POST", cache: "default" }),
      )
    })
  })
  it("aborts an upstream request at ten seconds", async () => {
    jest.useFakeTimers()
    jest.mocked(fetch).mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          )
        }),
    )
    const pending = screenWallet(ADDRESS)
    await jest.advanceTimersByTimeAsync(10_000)
    expect((await pending).status).toBe("unavailable")
  })
  it.each(["blocked", "clear", "unavailable"] as const)(
    "allows the local %s fixture for only the configured address",
    async (status) => {
      process.env = { ...process.env, NODE_ENV: "development" }
      const options = { devOverride: { address: ADDRESS, status } }
      expect((await screenWallet(ADDRESS, options)).status).toBe(status)
      expect(fetch).not.toHaveBeenCalled()
      respond(fixture(null))
      expect((await screenWallet(`0x${"a".repeat(40)}`, options)).status).toBe(
        "clear",
      )
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )
  it("ignores even an explicitly supplied override in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" }
    respond(fixture(true))
    expect(
      (
        await screenWallet(ADDRESS, {
          devOverride: { address: ADDRESS, status: "clear" },
        })
      ).status,
    ).toBe("blocked")
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("cancels the gateway request when its wallet scope changes", async () => {
    jest.mocked(fetch).mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new Error("cancelled")),
          )
        }),
    )
    const controller = new AbortController()
    const pending = screenWallet(ADDRESS, { signal: controller.signal })
    controller.abort()
    expect((await pending).status).toBe("unavailable")
    expect(jest.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
  it("does not fetch for an already cancelled scope", async () => {
    const controller = new AbortController()
    controller.abort()
    expect(
      (await screenWallet(ADDRESS, { signal: controller.signal })).status,
    ).toBe("unavailable")
    expect(fetch).not.toHaveBeenCalled()
  })
  it("rejects malformed addresses before fetching", async () => {
    await expect(screenWallet("not-an-address")).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
})
