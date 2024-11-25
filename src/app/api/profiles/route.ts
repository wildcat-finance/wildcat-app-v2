import { NextRequest, NextResponse } from "next/server"

import {
  getAllBorrowerProfiles,
  removeBorrowerProfile,
  resetTmpDb,
} from "@/lib/tmp-db"

export async function GET() {
  const allProfiles = getAllBorrowerProfiles()

  return NextResponse.json(allProfiles)
}

// DELETE /api/profiles?borrower=<borrower | all>
// Test function only
export async function DELETE(request: NextRequest) {
  const borrower = request.nextUrl.searchParams.get("borrower")
  if (!borrower) {
    return NextResponse.json(
      { success: false, message: "No borrower provided" },
      { status: 400 },
    )
  }
  if (borrower === "all") {
    resetTmpDb()
  } else {
    removeBorrowerProfile(borrower)
  }
  return NextResponse.json({ success: true })
}
