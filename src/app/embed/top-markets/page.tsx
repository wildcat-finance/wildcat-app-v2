"use client"

import { useEffect } from "react"

import { TopMarketsSectionNew } from "@/app/[locale]/lender/components/ExploreSection/TopMarketsSection/TopMarketsSectionNew"

import { useEmbedMarkets } from "../hooks/useEmbedMarkets"

export default function TopMarketsEmbedPage() {
  const { markets, borrowers, isLoading } = useEmbedMarkets()

  useEffect(() => {
    const postHeight = () => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage({ type: "iframe-height", height }, "*")
    }

    window.addEventListener("load", postHeight)

    const ro = new ResizeObserver(postHeight)
    ro.observe(document.body)

    postHeight()

    return () => {
      window.removeEventListener("load", postHeight)
      ro.disconnect()
    }
  }, [])

  return (
    <TopMarketsSectionNew
      markets={markets}
      borrowers={borrowers}
      isLoading={isLoading}
    />
  )
}
