import { NextResponse } from "next/server"

import { getAllBorrowerProfiles } from "@/lib/tmp-db"

export async function GET() {
  const allProfiles = getAllBorrowerProfiles()

  return NextResponse.json(allProfiles)
}
