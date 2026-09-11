/* eslint-disable import/no-extraneous-dependencies */
import type { DataGridProps } from "@mui/x-data-grid"
import { fireEvent, render, screen, within } from "@testing-library/react"
import {
  Market,
  MarketVersion,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { MarketsBlock } from "."

jest.mock("@mui/x-data-grid", () => {
  const actual =
    jest.requireActual<typeof import("@mui/x-data-grid")>("@mui/x-data-grid")
  return {
    ...actual,
    // Keep the real sorting and header interactions; jsdom has no layout.
    DataGrid: (props: DataGridProps) => (
      <actual.DataGrid {...props} disableVirtualization />
    ),
  }
})

jest.mock("next/navigation", () => ({
  usePathname: () => "/profile/borrower/0xborrower",
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "common.fields.lenderApr": "Lender APR",
        "common.fields.totalDebt": "Total Debt",
      }
      return labels[key] ?? key
    },
  }),
}))

jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => false,
}))
jest.mock("@/components/Mobile/MobileMarketList", () => ({
  MobileMarketList: () => null,
}))
jest.mock("@/components/Profile/shared/AnalyticsDataGrid", () => ({
  analyticsDataGridSx: {},
  autoHeightAnalyticsDataGridSx: {},
}))
jest.mock("@/components/@extended/MarketStatusChip", () => ({
  MarketStatusChip: () => null,
}))
jest.mock("@/components/@extended/MarketTypeChip", () => ({
  MarketTypeChip: () => null,
}))
jest.mock("@/utils/marketStatus", () => ({
  getMarketStatusChip: () => ({ status: "Healthy" }),
}))
jest.mock("@/utils/marketType", () => ({
  getMarketTypeChip: () => ({ kind: "OpenTerm" }),
}))

const makeMarket = (
  id: number,
  name: string,
  aprBips: number,
  debt: string,
  decimals = 6,
) => {
  const address = `0x${id.toString(16).padStart(40, "0")}`
  const provider = {
    call: async () => {
      throw new Error("Unexpected RPC call")
    },
  }
  const underlyingToken = new Token(
    SupportedChainId.Sepolia,
    `0x${(id + 100).toString(16).padStart(40, "0")}`,
    "Asset",
    "AST",
    decimals,
    false,
    provider,
  )
  const marketToken = new Token(
    SupportedChainId.Sepolia,
    address,
    name,
    "wcAST",
    decimals,
    false,
    provider,
  )
  return {
    address,
    chainId: SupportedChainId.Sepolia,
    name,
    version: MarketVersion.V2,
    marketKind: "standard",
    isClosed: false,
    underlyingToken,
    marketToken,
    totalDebts: underlyingToken.parseAmount(debt),
    maxTotalSupply: marketToken.parseAmount("100000000000"),
    totalSupply: marketToken.getAmount(0n),
    withdrawalBatchDuration: 86_400,
    currentAprDisplayBips: {
      isRevolving: false,
      configuredAprKind: "annualInterest",
      configuredAprBips: 0,
      currentProtocolAprBips: 0,
      currentEffectiveLenderAprBips: aprBips,
    },
  } as unknown as Market
}

const displayedNames = () =>
  screen
    .getAllByRole("row")
    .filter((row) => row.hasAttribute("data-id"))
    .map((row) => within(row).getAllByRole("link")[0].textContent)

const clickHeader = (name: string) =>
  fireEvent.click(screen.getByRole("columnheader", { name }))

describe("borrower profile market sorting", () => {
  it("cycles numeric lender APR sorting repeatedly without crashing", () => {
    const markets = [
      makeMarket(1, "Ten percent", 1000, "10"),
      makeMarket(2, "Two percent", 200, "20"),
      makeMarket(3, "Nine percent", 900, "30"),
    ]
    render(<MarketsBlock markets={markets} />)

    for (let cycle = 0; cycle < 4; cycle += 1) {
      clickHeader("Lender APR")
      expect(displayedNames()).toEqual([
        "Two percent",
        "Nine percent",
        "Ten percent",
      ])
      clickHeader("Lender APR")
      expect(displayedNames()).toEqual([
        "Ten percent",
        "Nine percent",
        "Two percent",
      ])
      clickHeader("Lender APR")
      expect(displayedNames()).toEqual(markets.map((market) => market.name))
    }
  })

  it("sorts total debt across token addresses and decimals in both directions", () => {
    const markets = [
      makeMarket(1, "Hundred", 100, "100"),
      makeMarket(2, "Zero", 100, "0"),
      makeMarket(3, "Two", 100, "2"),
      makeMarket(4, "Ten", 100, "10", 18),
    ]
    render(<MarketsBlock markets={markets} />)

    clickHeader("Total Debt")
    expect(displayedNames()).toEqual(["Zero", "Two", "Ten", "Hundred"])
    clickHeader("Total Debt")
    expect(displayedNames()).toEqual(["Hundred", "Ten", "Two", "Zero"])
    clickHeader("Total Debt")
    expect(displayedNames()).toEqual(markets.map((market) => market.name))
  })

  it("preserves one-unit debt differences above the safe integer range", () => {
    render(
      <MarketsBlock
        markets={[
          makeMarket(1, "Larger", 100, "9007199254.740994"),
          makeMarket(2, "Smaller", 100, "9007199254.740993"),
        ]}
      />,
    )

    clickHeader("Total Debt")
    expect(displayedNames()).toEqual(["Smaller", "Larger"])
    clickHeader("Total Debt")
    expect(displayedNames()).toEqual(["Larger", "Smaller"])
  })
})
