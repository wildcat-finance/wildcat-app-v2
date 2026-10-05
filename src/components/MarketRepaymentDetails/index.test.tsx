/* eslint-disable import/no-extraneous-dependencies */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Market } from "@wildcatfi/wildcat-sdk"

import en from "@/locales/en/en.json"

import { MarketRepaymentDetails } from "./index"

const historyRead = jest.fn()
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getMarketRepaymentHistory: (...args: unknown[]) => historyRead(...args),
}))
jest.mock("@/lib/gateway/client", () => ({ getAppSubgraphClient: () => ({}) }))
jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: ({ chainId }: { chainId: number }) => ({
    getTxUrl: (hash: string) => `https://explorer/${chainId}/tx/${hash}`,
  }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, string> = {}) => {
      const lookup =
        key === "marketDetails.repayment.hours"
          ? `${key}_${Number(values.count) === 1 ? "one" : "other"}`
          : key
      const value = lookup
        .split(".")
        .reduce<unknown>(
          (obj, part) => (obj as Record<string, unknown>)[part],
          en,
        ) as string
      return value.replace(/{{(\w+)}}/g, (_, name) => String(values[name]))
    },
  }),
}))

const makeMarket = () =>
  Object.assign(Object.create(Market.prototype), {
    chainId: 11155111,
    address: "0x1111111111111111111111111111111111111111",
    repaymentDate: 1_893_499_200,
    repaymentPeriod: 3600,
    repaymentDeadline: 1_893_502_800,
    lastInterestAccruedTimestamp: 1_893_499_200 - 1,
    defaultedAt: 0,
    isClosed: false,
  }) as Market
const display = (market: Market) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MarketRepaymentDetails market={market} />
    </QueryClientProvider>,
  )
}

describe("observed repayment lifecycle", () => {
  beforeEach(() => {
    historyRead.mockReset()
  })

  it("hides unsupported legacy lifecycle fields and never queries their schema", () => {
    const market = makeMarket()
    market.repaymentDate = undefined
    display(market)
    expect(screen.queryByText("Repayment")).toBeNull()
    expect(historyRead).not.toHaveBeenCalled()
  })

  it("distinguishes supported but unscheduled markets", () => {
    const market = makeMarket()
    market.repaymentDate = 0
    market.repaymentPeriod = 0
    market.repaymentDeadline = 0
    display(market)
    expect(screen.getByText("No scheduled repayment")).toBeTruthy()
    expect(screen.queryByText("Repayment deadline")).toBeNull()
  })

  it("uses observed time rather than advancing state or inferring default from the browser clock", () => {
    const market = makeMarket()
    // A browser far beyond the deadline cannot advance the SDK snapshot.
    const now = jest.spyOn(Date, "now").mockReturnValue(2_000_000_000_000)
    display(market)
    expect(screen.getByText("Scheduled")).toBeTruthy()
    expect(screen.queryByText("Defaulted at")).toBeNull()
    now.mockRestore()
  })

  it("shows repayment access changes and preserves a recorded default after closure", () => {
    const market = makeMarket()
    market.lastInterestAccruedTimestamp = market.repaymentDate!
    const view = display(market)
    expect(screen.getByText("In repayment")).toBeTruthy()
    expect(screen.getByText(/regardless of withdrawal windows/)).toBeTruthy()
    view.unmount()
    market.isClosed = true
    market.defaultedAt = market.repaymentDeadline!
    display(market)
    expect(screen.getByText("Closed")).toBeTruthy()
    expect(screen.getByText("Defaulted at")).toBeTruthy()
    expect(screen.getByText(/closure does not remove that record/)).toBeTruthy()
  })

  it("loads history on demand and separates effective time from the recording transaction", async () => {
    const market = makeMarket()
    historyRead.mockResolvedValue({
      activation: {
        effectiveTimestamp: 1_893_499_200,
        blockTimestamp: BigInt(1_893_502_800),
        blockNumber: BigInt(123),
        transactionHash: "0xactivation",
        logIndex: BigInt(1),
      },
    })
    display(market)
    expect(historyRead).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole("button", { name: "View repayment history" }),
    )
    await screen.findByText("Repayment started")
    expect(
      screen.getByText("Effective: 01 Jan 2030, 12:00:00 UTC"),
    ).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: /Recorded: 01 Jan 2030, 13:00:00 UTC/ })
        .getAttribute("href"),
    ).toBe("https://explorer/11155111/tx/0xactivation")
  })

  it("does not turn missing records into an assertion that the deadline was met", async () => {
    historyRead.mockResolvedValue(undefined)
    display(makeMarket())
    fireEvent.click(
      screen.getByRole("button", { name: "View repayment history" }),
    )
    await waitFor(() =>
      expect(
        screen.getByText("No repayment events have been indexed yet."),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Missing events do not establish/)).toBeTruthy()
  })
})
