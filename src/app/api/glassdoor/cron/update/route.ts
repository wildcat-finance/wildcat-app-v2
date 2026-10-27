import { NextRequest, NextResponse } from "next/server"
import { start } from "workflow/api"

import { glassDoorUpdateWorkflow } from "@/lib/glassdoor/jobs/updateWorkflow"

export const runtime = "nodejs"

// Five-minute Glass Door update. Off unless GLASSDOOR_ENABLED is "true", so
// deploying the code does not start indexing on its own.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (
    process.env.NODE_ENV !== "development" &&
    (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (process.env.GLASSDOOR_ENABLED !== "true") {
    return NextResponse.json({ started: false, reason: "disabled" })
  }
  const run = await start(glassDoorUpdateWorkflow, [])
  return NextResponse.json({ started: true, runId: run.runId })
}
