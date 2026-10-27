/* eslint-disable import/no-extraneous-dependencies */
import * as React from "react"

import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import "@testing-library/jest-dom"
import {
  fireEvent,
  render as renderUI,
  screen,
  within,
} from "@testing-library/react"

import { useBorrowerAnalytics, useMarketAnalytics } from "./api"
import { BorrowerAnalyticsView } from "./BorrowerAnalytics"
import { LateShareRows } from "./charts"
import {
  MarketAnalytics,
  MarketAnalyticsView,
  sameSnapshot,
} from "./MarketAnalytics"
import { borrowerFixture, marketFixture } from "./storyFixtures"

jest.mock("./api", () => ({
  useMarketAnalytics: jest.fn(),
  useBorrowerAnalytics: jest.fn(),
}))

// Next/Jest stubs SVG imports as image objects; the app uses SVGR components.
jest.mock(
  "@/assets/icons/stack_icon.svg",
  () =>
    function StackIconMock() {
      return <svg aria-hidden="true" />
    },
)

const marketHook = useMarketAnalytics as jest.Mock
const borrowerHook = useBorrowerAnalytics as jest.Mock

// jsdom's CSS parser predates container queries. Ignore only those rules in
// these interaction tests; responsive layout is verified separately in Chromium.
const { insertRule } = CSSStyleSheet.prototype
beforeAll(() => {
  jest
    .spyOn(CSSStyleSheet.prototype, "insertRule")
    .mockImplementation(function (
      this: CSSStyleSheet,
      rule: string,
      index?: number,
    ) {
      if (rule.startsWith("@container")) return index ?? 0
      return insertRule.call(this, rule, index ?? 0)
    })
})
afterAll(() => jest.restoreAllMocks())

const render = (ui: React.ReactElement) =>
  renderUI(
    <CacheProvider value={createCache({ key: "gd-test", speedy: true })}>
      {ui}
    </CacheProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  borrowerHook.mockReturnValue({ data: undefined })
})

test("only compares the same borrower, chain and publication cut", () => {
  expect(sameSnapshot(marketFixture, borrowerFixture)).toBe(true)
  const mismatches = [
    {
      ...borrowerFixture,
      publication: { ...borrowerFixture.publication, id: "newer" },
    },
    {
      ...borrowerFixture,
      publication: { ...borrowerFixture.publication, cut: null },
    },
    {
      ...borrowerFixture,
      publication: {
        ...borrowerFixture.publication,
        cut: { ...borrowerFixture.publication.cut!, hash: "different" },
      },
    },
    {
      ...borrowerFixture,
      borrower: { ...borrowerFixture.borrower, chainId: 9745 },
    },
    {
      ...borrowerFixture,
      borrower: { ...borrowerFixture.borrower, address: "0xother" },
    },
  ]
  mismatches.forEach((borrower) => {
    expect(sameSnapshot(marketFixture, borrower)).toBe(false)
  })
})

test("does not display operator figures from another publication", () => {
  render(
    <MarketAnalyticsView
      market={marketFixture}
      borrower={{
        ...borrowerFixture,
        publication: { ...borrowerFixture.publication, id: "newer" },
      }}
    />,
  )
  expect(
    screen.getByText("Borrower comparisons are unavailable for this snapshot."),
  ).toBeInTheDocument()
  expect(screen.queryByText("92.1")).not.toBeInTheDocument()
})

test("disclosure, comparisons and Escape preserve accessible focus", () => {
  const { container } = render(<MarketAnalyticsView market={marketFixture} />)
  const trigger = screen.getByRole("button", { name: "Cash available" })
  trigger.focus()
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute("aria-expanded", "true")
  const panel = screen.getByRole("region", { name: "Cash available" })
  expect(panel.id).toBe(trigger.getAttribute("aria-controls"))
  expect(container.querySelector("button button")).toBeNull()
  const compare = within(panel).getByRole("button", { name: "All markets" })
  fireEvent.click(compare)
  expect(compare).toHaveAttribute("aria-pressed", "true")
  compare.focus()
  fireEvent.keyDown(compare, { key: "Escape" })
  expect(
    screen.queryByRole("region", { name: "Cash available" }),
  ).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute("aria-expanded", "false")
})

test("a partial borrower book is not presented as a whole-book comparison", () => {
  render(
    <MarketAnalyticsView
      market={marketFixture}
      borrower={{ ...borrowerFixture, partial: true }}
    />,
  )
  const comparison = screen.getByRole("region", { name: "Borrower comparison" })
  expect(comparison).toHaveTextContent(
    "Borrower totals exclude markets whose data is unavailable.",
  )
  expect(within(comparison).queryByText("92.1%")).not.toBeInTheDocument()
})

test("a book with no elapsed history does not show a perfect record or range", () => {
  render(
    <MarketAnalyticsView
      market={marketFixture}
      borrower={{
        ...borrowerFixture,
        values: {
          ...borrowerFixture.values,
          MARKET_DAYS: 0,
          S05: 100,
          S06: 100,
          S07: 100,
        },
      }}
    />,
  )
  const comparison = screen.getByRole("region", { name: "Borrower comparison" })
  expect(within(comparison).queryByText(/100%/)).not.toBeInTheDocument()
  expect(within(comparison).getAllByText("not available")).toHaveLength(1)
  expect(within(comparison).getByText("Unavailable")).toBeInTheDocument()
  expect(within(comparison).getByText("82.6%")).toBeInTheDocument()
})

test("under-review publications do not display stale supplied metrics", () => {
  render(
    <MarketAnalyticsView market={{ ...marketFixture, state: "UnderReview" }} />,
  )
  expect(screen.getByRole("status")).toHaveTextContent(
    "Market analytics are under review.",
  )
  expect(screen.queryByText("82.6")).not.toBeInTheDocument()
})

test("the market table keeps missing values distinct from zero and healthy", () => {
  render(
    <BorrowerAnalyticsView
      borrower={{
        ...borrowerFixture,
        markets: [
          {
            ...borrowerFixture.markets[0],
            values: { M77: "Open", M02: "USDC" },
          },
        ],
      }}
    />,
  )
  const table = screen.getByRole("table", { name: "Borrower markets" })
  const row = within(table).getAllByRole("row")[1]
  expect(within(row).getAllByText("Unavailable")).toHaveLength(5)
  expect(within(row).queryByText("In order")).not.toBeInTheDocument()
  expect(within(row).queryByText("No exit history")).not.toBeInTheDocument()
})

test("cash shortage and penalty time remain independent in charts", () => {
  render(
    <LateShareRows
      ids={[]}
      rows={[
        {
          label: "Market",
          lateShare: 2,
          penaltyShare: 5,
          valueLabel: "2% of life",
          tooltip: "Independent clocks",
        },
      ]}
    />,
  )
  expect(screen.getByRole("img")).toHaveAccessibleName(
    "Cash short 2.00% of life; penalty active 5.00% of life",
  )
  expect(screen.getByText("Penalty active 5.00%")).toBeInTheDocument()
})

test("load errors offer a working retry action", () => {
  const refetch = jest.fn()
  marketHook.mockReturnValue({ isError: true, refetch })
  render(<MarketAnalytics chainId={1} address={marketFixture.market.address} />)
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  expect(refetch).toHaveBeenCalledTimes(1)
})

test("loading announces its state and does not display a load failure", () => {
  marketHook.mockReturnValue({ isLoading: true })
  render(<MarketAnalytics chainId={1} address={marketFixture.market.address} />)
  expect(
    screen.getByRole("status", { name: "Loading analytics" }),
  ).toHaveAttribute("aria-busy", "true")
  expect(
    screen.queryByText("Analytics could not be loaded."),
  ).not.toBeInTheDocument()
})
