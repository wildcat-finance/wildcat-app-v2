import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { cleanupExpiredExportJobs } from "@/lib/export/jobs/cleanup"
import { removeExportObjects } from "@/lib/export/jobs/storage"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (
    process.env.NODE_ENV !== "development" &&
    (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deleted = await cleanupExpiredExportJobs(prisma, removeExportObjects)
  return NextResponse.json({ deleted })
}
