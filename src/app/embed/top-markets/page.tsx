"use client"

import { TopMarketsSectionNew } from "@/app/embed/components/TopMarketsSectionNew"

import { useEmbedMarkets } from "../hooks/useEmbedMarkets"
import { useIframeHeight } from "../hooks/useIframeHeight"

export default function TopMarketsEmbedPage() {
  const { markets, borrowers, isLoading } = useEmbedMarkets()
  const containerRef = useIframeHeight()

  return (
    <div ref={containerRef} style={{ paddingBottom: "24px" }}>
      <TopMarketsSectionNew
        markets={markets}
        borrowers={borrowers}
        isLoading={isLoading}
      />
    </div>
  )
}
