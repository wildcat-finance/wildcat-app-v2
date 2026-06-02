"use client"

import { TopMarketsSectionNew } from "@/app/embed/components/TopMarketsSectionNew"

import { useEmbedMarkets } from "../hooks/useEmbedMarkets"
import { useIframeHeight } from "../hooks/useIframeHeight"

export default function TopMarketsEmbedPage() {
  const { accounts, borrowers, isLoading } = useEmbedMarkets()
  const containerRef = useIframeHeight("top-markets")

  return (
    <div ref={containerRef} style={{ paddingBottom: "24px" }}>
      <TopMarketsSectionNew
        accounts={accounts}
        borrowers={borrowers}
        isLoading={isLoading}
      />
    </div>
  )
}
