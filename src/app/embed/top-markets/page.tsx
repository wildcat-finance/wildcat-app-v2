"use client"

import { useEffect, useRef } from "react"

import { TopMarketsSectionNew } from "@/app/[locale]/lender/components/ExploreSection/TopMarketsSection/TopMarketsSectionNew"

import { useEmbedMarkets } from "../hooks/useEmbedMarkets"

export default function TopMarketsEmbedPage() {
  const { markets, borrowers, isLoading } = useEmbedMarkets()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const postHeight = () => {
      window.parent.postMessage(
        { type: "iframe-height", height: container.offsetHeight },
        "*",
      )
    }

    const ro = new ResizeObserver(postHeight)
    ro.observe(container)

    // eslint-disable-next-line consistent-return
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef}>
      <TopMarketsSectionNew
        markets={markets}
        borrowers={borrowers}
        isLoading={isLoading}
      />
    </div>
  )
}
