import { NextRequest, NextResponse } from "next/server"

import {
  getAllBorrowerProfileUpdates,
  getBorrowerProfileUpdates,
  putBorrowerProfileUpdate,
  putBorrowerProfileUpdateResponse,
  removeBorrowerProfileUpdates,
} from "@/lib/tmp-db"

import { BorrowerProfileUpdateResponse } from "./interface"
import { BorrowerProfileInput } from "../interface"

export async function POST(request: NextRequest) {
  const data = (await request.json()) as BorrowerProfileInput

  console.log(`RECEIVE POST /api/profiles/updates`)
  console.log(data)

  const update = putBorrowerProfileUpdate({
    ...data,
  })
  return NextResponse.json({ success: true, updateId: update.updateId })
}

export async function GET(request: NextRequest) {
  const borrower = request.nextUrl.searchParams.get("borrower")
  if (!borrower) {
    return NextResponse.json(getAllBorrowerProfileUpdates())
  }
  return NextResponse.json(getBorrowerProfileUpdates(borrower))
}

export async function PUT(request: NextRequest) {
  const data = (await request.json()) as BorrowerProfileUpdateResponse
  putBorrowerProfileUpdateResponse(data)
  return NextResponse.json({ success: true })
}

// DELETE /api/profiles/updates?borrower=<borrower>
// Test function only
export async function DELETE(request: NextRequest) {
  const borrower = request.nextUrl.searchParams.get("borrower")
  if (!borrower) {
    return NextResponse.json(
      { success: false, message: "No borrower provided" },
      { status: 400 },
    )
  }
  removeBorrowerProfileUpdates(borrower)
  return NextResponse.json({ success: true })
}
