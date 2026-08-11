// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CanonicalExportRequest } from "@/lib/export/types"

import { ExportModal, exportErrorMessage, exportPhaseLabel } from "./index"

jest.mock("@/assets/icons/cross_icon.svg", () => () => <svg />)

const MARKET = "0x1111111111111111111111111111111111111111"
const ORIGINAL_JOB = "original-job"
const UPDATED_JOB = "updated-job"
const DOWNLOAD_URL = "https://storage.example/original.zip"

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
  afterEach(() => {
    jest.restoreAllMocks()
    Reflect.deleteProperty(global, "fetch")
    window.sessionStorage.clear()
  })

  it("distinguishes changed options from the completed ZIP and reuses its snapshot", async () => {
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
      />,
    )

    const originalDownload = await screen.findByRole("link", {
      name: "Download ZIP",
    })
    expect(originalDownload.getAttribute("href")).toBe(DOWNLOAD_URL)
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
    expect(submitted.snapshotBlock).toBe(originalRequest.snapshotBlock)
    expect(submitted.statements.sort()).toEqual([
      "borrower",
      "market_condition",
    ])
  })

  it("shows human-readable progress stages", () => {
    expect(exportPhaseLabel("building_transactions_2_of_8")).toBe(
      "Building transaction history — market 2 of 8",
    )
    expect(exportPhaseLabel("creating_statements")).toBe("Creating statements")
  })

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
