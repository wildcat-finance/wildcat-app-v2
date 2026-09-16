import { NextRequest, NextResponse } from "next/server"

import { reconcileExportJobs } from "@/lib/export/jobs/reconcile"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (
    process.env.NODE_ENV !== "development" &&
    (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ repaired: await reconcileExportJobs() })
}
