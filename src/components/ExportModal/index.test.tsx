// eslint-disable-next-line import/no-extraneous-dependencies
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CanonicalExportRequest } from "@/lib/export/types"

import { ExportModal, exportErrorMessage } from "./index"

jest.mock("@/assets/icons/cross_icon.svg", () => () => <svg />)

const MARKET = "0x1111111111111111111111111111111111111111"
const BORROWER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const OTHER_MARKET = "0x2222222222222222222222222222222222222222"
const OTHER_BORROWER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const ORIGINAL_JOB = "original-job"
const UPDATED_JOB = "updated-job"
const FRESH_JOB = "fresh-job"
const CLIENT_ID = "87dba73b-8516-43b3-bfaf-ea1ae6b6e366"
const DOWNLOAD_URL = `/api/export/jobs/${ORIGINAL_JOB}/download`

const originalRequest: CanonicalExportRequest = {
  chainId: 1,
  markets: [MARKET],
  statements: ["market_condition"],
  addresses: [],
  format: "pdf",
  snapshotBlock: "25632396",
  snapshotBlockHash: `0x${"12".repeat(32)}`,
}

const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

describe("ExportModal", () => {
  beforeEach(() => {
    Object.defineProperty(window.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => CLIENT_ID),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Reflect.deleteProperty(global, "fetch")
    window.sessionStorage.clear()
  })

  it("keeps the completed ZIP available and uses latest data for changed options", async () => {
    window.sessionStorage.setItem("wildcat-export-job:1", ORIGINAL_JOB)
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url === `/api/export/jobs/${ORIGINAL_JOB}`) {
          return response({
            status: "completed",
            progress: 100,
            phase: "completed",
            downloadUrl: DOWNLOAD_URL,
            snapshotTimestampUtc: "2026-07-28T16:04:35Z",
            request: originalRequest,
          })
        }
        if (url === "/api/export/jobs" && init?.method === "POST") {
          const submitted = JSON.parse(String(init.body))
          return response(
            {
              jobId: UPDATED_JOB,
              status: "queued",
              request: {
                ...originalRequest,
                statements: submitted.statements,
              },
            },
            202,
          )
        }
        if (url === `/api/export/jobs/${UPDATED_JOB}`) {
          return response({
            status: "queued",
            progress: 0,
            phase: "queued",
            request: {
              ...originalRequest,
              statements: ["borrower", "market_condition"],
            },
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
    )
    global.fetch = fetchMock

    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
      />,
    )

    const originalDownload = await screen.findByRole("link", {
      name: "Download ZIP",
    })
    expect(originalDownload.getAttribute("href")).toBe(DOWNLOAD_URL)
    expect(
      screen.getByText(/Data as of 28 Jul 2026, 16:04:35 UTC/),
    ).toBeTruthy()
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Market condition statement",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true)

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Borrower statement" }),
    )

    expect(
      screen.getByRole("button", { name: "Generate updated ZIP" }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "Download existing ZIP" })
        .getAttribute("href"),
    ).toBe(DOWNLOAD_URL)
    expect(screen.getByText(/Your selections have changed/)).toBeTruthy()

    fireEvent.click(
      screen.getByRole("button", { name: "Generate updated ZIP" }),
    )

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url) === "/api/export/jobs" && init?.method === "POST",
        ),
      ).toBe(true)
    })
    const submission = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/export/jobs" && init?.method === "POST",
    )
    const submitted = JSON.parse(String(submission?.[1]?.body))
    expect(submission?.[1]?.headers).toEqual({
      "content-type": "application/json",
      "X-Export-Client": CLIENT_ID,
    })
    expect(window.sessionStorage.getItem("wildcat-export-client")).toBe(
      CLIENT_ID,
    )
    expect(submitted.snapshotBlock).toBeUndefined()
    expect(submitted.statements.sort()).toEqual([
      "borrower",
      "market_condition",
    ])
  })

  it("lets users clear a connected-wallet default before entering another address", async () => {
    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
        defaultAddress={BORROWER}
      />,
    )
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Position statement (entered addresses)",
      }),
    )
    const input = screen.getByRole("textbox", {
      name: "Position addresses",
    }) as HTMLTextAreaElement
    expect(input.value).toBe(BORROWER)
    fireEvent.change(input, { target: { value: "" } })
    expect(input.value).toBe("")
    fireEvent.change(input, { target: { value: OTHER_BORROWER } })
    expect(input.value).toBe(OTHER_BORROWER)
  })

  it("clears a temporary polling error when the export recovers", async () => {
    window.sessionStorage.setItem("wildcat-export-job:1", ORIGINAL_JOB)
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        response({ error: "Temporarily unavailable" }, 503),
      )
      .mockResolvedValueOnce(
        response({
          status: "completed",
          progress: 100,
          downloadUrl: DOWNLOAD_URL,
          request: originalRequest,
        }),
      )
    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
      />,
    )
    expect(await screen.findByText("Temporarily unavailable")).toBeTruthy()
    expect(
      await screen.findByRole(
        "link",
        { name: "Download ZIP" },
        { timeout: 4_000 },
      ),
    ).toBeTruthy()
    expect(screen.queryByText("Temporarily unavailable")).toBeNull()
    expect(
      screen.getByText(
        `Existing export: block ${originalRequest.snapshotBlock}`,
      ),
    ).toBeTruthy()
  })

  it("ignores an in-flight shared-job poll after cancelling this export", async () => {
    window.sessionStorage.setItem("wildcat-export-job:1", ORIGINAL_JOB)
    const running = {
      status: "running",
      progress: 20,
      request: originalRequest,
    }
    let finishPoll!: (value: Response) => void
    const inFlightPoll = new Promise<Response>((resolve) => {
      finishPoll = resolve
    })
    let pollCount = 0
    global.fetch = jest.fn(async (_input, init) => {
      if (init?.method === "DELETE") return response({ status: "cancelled" })
      pollCount += 1
      return pollCount === 1 ? response(running) : inFlightPoll
    })
    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
      />,
    )
    await screen.findByRole("button", { name: "Cancel export" })
    await waitFor(() => expect(pollCount).toBe(2), { timeout: 2_500 })
    fireEvent.click(screen.getByRole("button", { name: "Cancel export" }))
    await screen.findByText("Export cancelled.")
    await act(async () => finishPoll(response(running)))
    expect(screen.getByRole("button", { name: "Generate export" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Cancel export" })).toBeNull()
    expect(window.sessionStorage.getItem("wildcat-export-job:1")).toBeNull()
  })

  it("can generate a fresh snapshot without discarding the completed ZIP", async () => {
    window.sessionStorage.setItem("wildcat-export-job:1", ORIGINAL_JOB)
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url === `/api/export/jobs/${ORIGINAL_JOB}`) {
          return response({
            status: "completed",
            progress: 100,
            phase: "completed",
            downloadUrl: DOWNLOAD_URL,
            request: originalRequest,
          })
        }
        if (url === "/api/export/jobs" && init?.method === "POST") {
          return response(
            {
              jobId: FRESH_JOB,
              status: "queued",
              request: {
                ...originalRequest,
                snapshotBlock: "25632450",
              },
            },
            202,
          )
        }
        if (url === `/api/export/jobs/${FRESH_JOB}`) {
          return response({
            status: "queued",
            progress: 0,
            phase: "queued",
            request: {
              ...originalRequest,
              snapshotBlock: "25632450",
            },
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
    )
    global.fetch = fetchMock

    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
      />,
    )

    expect(
      (await screen.findByRole("link", { name: "Download ZIP" })).getAttribute(
        "href",
      ),
    ).toBe(DOWNLOAD_URL)
    fireEvent.click(screen.getByRole("button", { name: "Generate fresh ZIP" }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url) === "/api/export/jobs" && init?.method === "POST",
        ),
      ).toBe(true)
    })
    const submission = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/export/jobs" && init?.method === "POST",
    )
    const submitted = JSON.parse(String(submission?.[1]?.body))
    expect(submitted.snapshotBlock).toBeUndefined()
    expect(screen.queryByRole("link", { name: "Download ZIP" })).toBeNull()
  })

  it("loads the market catalogue when Selected is opened", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/export/markets?chainId=1") {
        return response({
          markets: [
            {
              address: MARKET,
              name: "Test Market",
              symbol: "wmUSDC",
              borrower: BORROWER,
              isActive: true,
            },
          ],
          borrowers: [
            {
              address: BORROWER,
              name: "Test Borrower",
              marketAddresses: [MARKET],
            },
          ],
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    global.fetch = fetchMock

    render(
      <ExportModal
        open
        onClose={jest.fn()}
        chainId={1}
        marketAddress={MARKET}
        borrowerAddress={BORROWER}
      />,
    )

    expect(screen.queryByRole("button", { name: "All V2" })).toBeNull()
    expect(
      screen
        .getByRole("button", { name: "This market" })
        .getAttribute("aria-pressed"),
    ).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "Selected" }))

    fireEvent.mouseDown(
      await screen.findByRole("combobox", { name: "Selected markets" }),
    )
    expect(await screen.findByText("wmUSDC - Test Market")).toBeTruthy()
    expect(screen.getByText(MARKET)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith("/api/export/markets?chainId=1", {
      signal: expect.any(AbortSignal),
    })
    expect(screen.queryByText("Loading…")).toBeNull()
  })

  it.each([
    [1, "Ethereum Mainnet"],
    [11155111, "Sepolia"],
  ] as const)(
    "labels borrowers with their network and market count on %s",
    async (chainId, networkName) => {
      const borrowerMarkets = [MARKET, OTHER_MARKET]
      const otherBorrowerMarket = "0x3333333333333333333333333333333333333333"
      const fetchMock = jest.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (
            url ===
            `/api/export/markets?chainId=${chainId}&includeBorrowers=true`
          ) {
            return response({
              markets: borrowerMarkets.map((address, index) => ({
                address,
                name: `Market ${index + 1}`,
                symbol: `M${index + 1}`,
                borrower: BORROWER,
                isActive: true,
              })),
              borrowers: [
                {
                  address: OTHER_BORROWER,
                  name: "Other Borrower",
                  marketAddresses: [otherBorrowerMarket],
                },
                {
                  address: BORROWER,
                  name: "Current Borrower",
                  marketAddresses: borrowerMarkets,
                },
              ],
            })
          }
          if (url === "/api/export/jobs" && init?.method === "POST") {
            const submitted = JSON.parse(String(init.body))
            return response(
              {
                jobId: "borrower-job",
                status: "queued",
                request: {
                  ...originalRequest,
                  markets: submitted.markets,
                },
              },
              202,
            )
          }
          if (url === "/api/export/jobs/borrower-job") {
            return response({
              status: "queued",
              progress: 0,
              phase: "queued",
              request: { ...originalRequest, markets: [otherBorrowerMarket] },
            })
          }
          throw new Error(`Unexpected fetch: ${url}`)
        },
      )
      global.fetch = fetchMock

      render(
        <ExportModal
          open
          onClose={jest.fn()}
          chainId={chainId}
          marketAddress={MARKET}
          borrowerAddress={BORROWER}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Borrower" }))
      const borrowerInput = await screen.findByDisplayValue(
        `Current Borrower (${networkName} - 2 markets)`,
      )
      expect(
        screen.getByText("Includes 2 active V2 markets on this chain."),
      ).toBeTruthy()

      fireEvent.mouseDown(borrowerInput)
      fireEvent.click(
        await screen.findByText(`Other Borrower (${networkName} - 1 market)`),
      )
      expect(
        screen.getByDisplayValue(`Other Borrower (${networkName} - 1 market)`),
      ).toBeTruthy()
      expect(
        screen.getByText("Includes 1 active V2 market on this chain."),
      ).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "Generate export" }))

      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(
            ([url, init]) =>
              String(url) === "/api/export/jobs" && init?.method === "POST",
          ),
        ).toBe(true)
      })
      const submission = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === "/api/export/jobs" && init?.method === "POST",
      )
      expect(JSON.parse(String(submission?.[1]?.body)).markets).toEqual([
        otherBorrowerMarket,
      ])
    },
  )

  it("does not expose workflow internals for provider rate limits", () => {
    expect(
      exportErrorMessage(
        'Step "step//resolveMarkets" failed after 3 retries: eth_getLogs failed on every configured provider: RPC HTTP 429',
      ),
    ).toBe(
      "Blockchain data providers are temporarily busy. Please try the export again shortly.",
    )
    expect(
      exportErrorMessage(
        'Step "step//resolveMarkets" failed after 3 retries: Invalid market',
      ),
    ).toBe("Invalid market")
  })
})
