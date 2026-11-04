import { NextResponse } from "next/server"

import { reviewEnabled } from "@/components/GlassDoorReview/gate"
import { prisma } from "@/lib/db"

import { listReviewBorrowers } from "./list"

// Temporary: the metric review page (product#917). Remove with the page.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (!reviewEnabled())
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(await listReviewBorrowers(prisma), {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  })
}
