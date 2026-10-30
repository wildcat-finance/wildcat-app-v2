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
import { LateShareBars } from "./charts"
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

test("one card opens at a time and Escape returns focus to it", () => {
  const { container } = render(<MarketAnalyticsView market={marketFixture} />)
  const card = (id: string) =>
    container.querySelector<HTMLButtonElement>(`[data-card="${id}"]`)!
  // The market page opens card 2.1 on load.
  expect(card("2.1")).toHaveAttribute("aria-expanded", "true")
  expect(screen.getByRole("region", { name: /^In order/ })).toBeInTheDocument()
  card("2.2").focus()
  fireEvent.click(card("2.2"))
  expect(card("2.1")).toHaveAttribute("aria-expanded", "false")
  expect(card("2.2")).toHaveAttribute("aria-expanded", "true")
  const panel = screen.getByRole("region", { name: /^Worst incident/ })
  expect(panel.id).toBe(card("2.2").getAttribute("aria-controls"))
  expect(container.querySelector("button button")).toBeNull()
  ;[
    "How it is calculated",
    "Comparison",
    "What it means",
    "What it tells you",
    "What it does not tell you",
  ].forEach((heading) => {
    expect(within(panel).getByText(heading)).toBeInTheDocument()
  })
  const compare = within(panel).getByRole("button", { name: "vs all markets" })
  fireEvent.click(compare)
  expect(compare).toHaveAttribute("aria-pressed", "true")
  compare.focus()
  fireEvent.keyDown(compare, { key: "Escape" })
  expect(
    screen.queryByRole("region", { name: /^Worst incident/ }),
  ).not.toBeInTheDocument()
  expect(card("2.2")).toHaveFocus()
  expect(card("2.2")).toHaveAttribute("aria-expanded", "false")
})

test("a partial borrower book is not presented as a whole-book comparison", () => {
  render(
    <MarketAnalyticsView
      market={marketFixture}
      borrower={{ ...borrowerFixture, partial: true }}
    />,
  )
  const operator = screen.getByRole("region", { name: "The operator" })
  expect(operator).toHaveTextContent(
    "Borrower totals exclude markets whose data is unavailable.",
  )
  expect(within(operator).queryByText(/92\.1/)).not.toBeInTheDocument()
})

test("a book with no elapsed history does not show a perfect record", () => {
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
  const operator = screen.getByRole("region", { name: "The operator" })
  expect(within(operator).getByText(/no recorded history/)).toBeInTheDocument()
  expect(within(operator).queryByText(/100\.0/)).not.toBeInTheDocument()
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
  expect(within(row).getAllByText("not available")).toHaveLength(5)
  expect(within(row).queryByText("in order")).not.toBeInTheDocument()
  expect(within(row).queryByText("no exit history yet")).not.toBeInTheDocument()
})

test("late share and past-allowance time stay separate in the 3.12 bars", () => {
  render(
    <LateShareBars
      rows={[
        { label: "Market", withinPct: 2, pastPct: 0.5, lateDays: "1.0 d" },
      ]}
    />,
  )
  expect(screen.getByRole("img")).toHaveAccessibleName(
    "Market: 2.5% of its life late, 0.5% past the allowance, 1.0 d late",
  )
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
