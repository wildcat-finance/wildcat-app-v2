/* eslint-disable camelcase */

"use client"

import { SubgraphMarket_Filter } from "@wildcatfi/wildcat-sdk"

export const TOKENS_ADDRESSES = {
  WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
}

export const TIMESTAMP_KEY = "lastFetchedTimestamp"

// Show if on development or if host is secretsite.wildcat.finance
export const shouldShowExcludedMarkets =
  process.env.NODE_ENV === "development" ||
  (typeof window !== "undefined" &&
    window.location.host === "secretsite.wildcat.finance")

export const EXCLUDED_MARKETS = shouldShowExcludedMarkets
  ? []
  : [
      "0xd6440bd3c97e8bfbdc311cbbb50ada03ade4810a",
      "0xfe7cf5680d2e59500f3938c2539fda4754876f94",
    ]

export const EXCLUDED_BORROWERS = shouldShowExcludedMarkets
  ? []
  : ["0x569e7cb1a1c839133012de4adee8361389b0113b"]

export const EXCLUDED_MARKETS_FILTER: SubgraphMarket_Filter[] =
  shouldShowExcludedMarkets
    ? []
    : [
        {
          borrower_not_in: EXCLUDED_BORROWERS,
        },
        { id_not_in: EXCLUDED_MARKETS },
      ]

export const pageCalcHeights = {
  dashboard: "256px",
  page: "82px",
  market: "194px",
}
