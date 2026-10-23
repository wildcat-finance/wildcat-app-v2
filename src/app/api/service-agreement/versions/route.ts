import { NextResponse } from "next/server"

import { listServiceAgreementVersions } from "@/lib/serviceAgreement"

export async function GET() {
  return NextResponse.json(await listServiceAgreementVersions())
}

export const dynamic = "force-dynamic"
