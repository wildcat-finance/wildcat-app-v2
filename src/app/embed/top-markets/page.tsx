"use client"

import { TopMarketsSectionNew } from "@/app/[locale]/lender/components/ExploreSection/TopMarketsSection/TopMarketsSectionNew"

import { useEmbedMarkets } from "../hooks/useEmbedMarkets"

export default function TopMarketsEmbedPage() {
  const { markets, borrowers, isLoading } = useEmbedMarkets()

  return (
    <TopMarketsSectionNew
      markets={markets}
      borrowers={borrowers}
      isLoading={isLoading}
    />
  )
}
