import { useState } from "react"

import { Box } from "@mui/material"
import type { Meta } from "@storybook/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import type {
  AnalyticsResult,
  BorrowerAnalytics as BorrowerData,
  MarketAnalytics as MarketData,
} from "./api"
import { BorrowerAnalytics } from "./BorrowerAnalytics"
import { MarketAnalytics } from "./MarketAnalytics"
import {
  borrowerFixture,
  marketFixture,
  STORY_BORROWER_ADDRESS,
  STORY_MARKET_ADDRESS,
} from "./storyFixtures"

type PreviewProps = {
  view?: "market" | "borrower"
  market?: AnalyticsResult<MarketData>
  borrower?: AnalyticsResult<BorrowerData>
  error?: boolean
  loading?: boolean
}

const Preview = ({
  view = "market",
  market = { status: "ok", data: marketFixture },
  borrower = { status: "ok", data: borrowerFixture },
  error,
  loading,
}: PreviewProps) => {
  const [client] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    })
    const marketKey = ["glassdoor", "market", 1, STORY_MARKET_ADDRESS]
    const borrowerKey = ["glassdoor", "borrower", 1, STORY_BORROWER_ADDRESS]
    queryClient.setQueryData(marketKey, market, {
      updatedAt: Date.now() + 86_400_000,
    })
    const matchingBorrower =
      view === "market" && market.status === "ok" && borrower.status === "ok"
        ? {
            ...borrower,
            data: {
              ...borrower.data,
              markets: borrower.data.markets.map((row) =>
                row.address === market.data.market.address
                  ? {
                      ...row,
                      values: market.data.values,
                      state: market.data.state,
                    }
                  : row,
              ),
            },
          }
        : borrower
    queryClient.setQueryData(borrowerKey, matchingBorrower, {
      updatedAt: Date.now() + 86_400_000,
    })
    if (error || loading) {
      const key = view === "market" ? marketKey : borrowerKey
      queryClient
        .getQueryCache()
        .find({ queryKey: key })
        ?.setState({
          status: error ? "error" : "pending",
          fetchStatus: loading ? "fetching" : "idle",
          error: error
            ? new globalThis.Error("Storybook unavailable response")
            : null,
        })
    }
    return queryClient
  })
  return (
    <QueryClientProvider client={client}>
      <Box
        sx={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: { xs: "20px 16px", sm: "32px" },
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {view === "borrower" ? (
          <BorrowerAnalytics chainId={1} address={STORY_BORROWER_ADDRESS} />
        ) : (
          <MarketAnalytics
            chainId={1}
            address={STORY_MARKET_ADDRESS}
            borrowerAddress={STORY_BORROWER_ADDRESS}
          />
        )}
      </Box>
    </QueryClientProvider>
  )
}

export default {
  title: "Glass Door/Analytics",
  component: Preview,
  parameters: { layout: "fullscreen" },
} as Meta<typeof Preview>

export const Market = () => <Preview />
export const Borrower = () => <Preview view="borrower" />
export const BorrowerLoading = () => <Preview view="borrower" loading />
export const BorrowerError = () => <Preview view="borrower" error />
export const BorrowerPreparing = () => (
  <Preview view="borrower" borrower={{ status: "preparing" }} />
)
export const BorrowerUnderReview = () => (
  <Preview
    view="borrower"
    borrower={{
      status: "ok",
      data: { ...borrowerFixture, state: "UnderReview", values: {} },
    }}
  />
)
export const ThinHistory = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        comparisons: {},
        values: {
          ...marketFixture.values,
          M05: 12,
          H01: 12 * 86_400,
          H02: 0,
          M18: 100,
          M20: 0,
          M23: 0,
          M24: null,
          M26: 0,
          M30: 3,
          M31: 3,
          M32: 100,
          D18_LATE: 0,
          D18_NEVER: 0,
        },
      },
    }}
  />
)
export const MissingMetrics = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        comparisons: {},
        values: { M02: "USDC", M77: "Open" },
      },
    }}
  />
)
export const UnderReview = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        state: "UnderReview",
        reason: "Evidence is being checked",
        values: {},
      },
    }}
  />
)
export const PartialBorrower = () => (
  <Preview
    view="borrower"
    borrower={{
      status: "ok",
      data: {
        ...borrowerFixture,
        partial: true,
        markets: borrowerFixture.markets.map((market, index) =>
          index === 1
            ? { ...market, state: "UnderReview", values: {} }
            : market,
        ),
      },
    }}
  />
)
export const UnknownExitSplit = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        values: { ...marketFixture.values, D18_LATE: null, D18_NEVER: null },
      },
    }}
  />
)
export const ResidualPenalty = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        values: {
          ...marketFixture.values,
          M21: 0,
          M85: 1,
          D05: "6.6 h past grace",
          M84: 0.05,
        },
      },
    }}
  />
)
export const ClosedMarket = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        values: { ...marketFixture.values, M77: "Closed" },
      },
    }}
  />
)
export const MismatchedSnapshots = () => (
  <Preview
    borrower={{
      status: "ok",
      data: {
        ...borrowerFixture,
        publication: {
          ...borrowerFixture.publication,
          id: "another-publication",
        },
      },
    }}
  />
)
export const Preparing = () => <Preview market={{ status: "preparing" }} />
export const Unavailable = () => <Preview market={{ status: "unavailable" }} />
export const Error = () => <Preview error />
export const Loading = () => <Preview loading />

export const MissingSnapshot = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        publication: { ...marketFixture.publication, cut: null },
      },
    }}
  />
)

export const IntradaySnapshot = () => (
  <Preview
    market={{
      status: "ok",
      data: {
        ...marketFixture,
        publication: { ...marketFixture.publication, kind: "Intraday" },
      },
    }}
  />
)

export const MissingBorrowerMetrics = () => (
  <Preview
    view="borrower"
    borrower={{
      status: "ok",
      data: {
        ...borrowerFixture,
        comparisons: {},
        values: { S01: 5 },
        markets: borrowerFixture.markets.map((market) => ({
          ...market,
          values: { M02: market.values.M02, M77: "Open" },
        })),
      },
    }}
  />
)

export const LongValues = () => (
  <Preview
    view="borrower"
    borrower={{
      status: "ok",
      data: {
        ...borrowerFixture,
        markets: borrowerFixture.markets.map((market) => ({
          ...market,
          symbol: "VeryLongMarketTokenSymbolUSDC",
          name: "Long institutional borrower credit facility for USD Coin",
          values: { ...market.values, M07: 123_456_789_012_345 },
        })),
      },
    }}
  />
)
