import { NextRequest, NextResponse } from "next/server"
import { start } from "workflow/api"

import { glassDoorAuditWorkflow } from "@/lib/glassdoor/jobs/auditWorkflow"

export const runtime = "nodejs"

// Nightly Glass Door audit. Off unless GLASSDOOR_ENABLED is "true".
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
  const run = await start(glassDoorAuditWorkflow, [])
  return NextResponse.json({ started: true, runId: run.runId })
}
