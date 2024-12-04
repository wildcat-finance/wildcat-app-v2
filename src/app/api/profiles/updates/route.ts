import { NextRequest, NextResponse } from "next/server"

let mockProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: "",
  linkedin: "",
  updatedAt: 1679616000000,
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  console.log(`RECEIVE POST /api/profiles/updates`)
  console.log(data)

  mockProfile = { ...mockProfile, ...data }

  return NextResponse.json({ success: true, updatedProfile: mockProfile })
}

export async function GET() {
  return NextResponse.json(mockProfile)
}

// export async function POST(request: NextRequest) {
//   const data = (await request.json()) as BorrowerProfileInput
//
//   console.log(`RECEIVE POST /api/profiles/updates`)
//   console.log(data)
//
//   const update = putBorrowerProfileUpdate({
//     ...data,
//   })
//   return NextResponse.json({ success: true, updateId: update.updateId })
// }
//
// export async function GET(request: NextRequest) {
//   const borrower = request.nextUrl.searchParams.get("borrower")
//   if (!borrower) {
//     return NextResponse.json(getAllBorrowerProfileUpdates())
//   }
//   return NextResponse.json(getBorrowerProfileUpdates(borrower))
// }
//
// export async function PUT(request: NextRequest) {
//   const data = (await request.json()) as BorrowerProfileUpdateResponse
//   putBorrowerProfileUpdateResponse(data)
//   return NextResponse.json({ success: true })
// }
//
// // DELETE /api/profiles/updates?borrower=<borrower>
// // Test function only
// export async function DELETE(request: NextRequest) {
//   const borrower = request.nextUrl.searchParams.get("borrower")
//   if (!borrower) {
//     return NextResponse.json(
//       { success: false, message: "No borrower provided" },
//       { status: 400 },
//     )
//   }
//   removeBorrowerProfileUpdates(borrower)
//   return NextResponse.json({ success: true })
// }
