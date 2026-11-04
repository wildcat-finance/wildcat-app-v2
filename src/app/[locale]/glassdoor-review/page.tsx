import { Suspense } from "react"

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MetricReview } from "@/components/GlassDoorReview"
import { reviewEnabled } from "@/components/GlassDoorReview/gate"

// Temporary: the metric review page (product#917), for preview deploys only.
// Remove this route, src/components/GlassDoorReview and
// src/app/api/glassdoor/v1/review once the selection is made.

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Glass Door metric review",
  robots: { index: false, follow: false },
}

export default function GlassDoorReviewPage() {
  if (!reviewEnabled()) notFound()
  return (
    <Suspense>
      <MetricReview />
    </Suspense>
  )
}
