import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { getBorrowerProfileUpdates, prisma } from "@/lib/db"
import { getZodParseError } from "@/lib/zod-error"

import {
  BorrowerProfileInputDTO,
  BorrowerProfileUpdateResponseDTO,
} from "./dto"
import { BorrowerProfileUpdateResponse } from "./interface"
import { verifyApiToken } from "../../auth/verify-header"
import { BorrowerProfileInput } from "../interface"

/// POST /api/profiles/updates
/// Route to submit a new borrower profile update request.
/// If there is an existing update which is pending, the old update should be deleted.
///
/// Borrower-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let data: BorrowerProfileInput
  try {
    const input = await request.json()
    data = BorrowerProfileInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }

  const {
    name,
    description,
    founded,
    headquarters,
    website,
    twitter,
    linkedin,
    email,
  } = data

  const address = token.address.toLowerCase()
  const chainId = TargetChainId
  const existingBorrower = await prisma.borrower.findFirst({
    where: {
      chainId,
      address,
    },
  })
  if (!existingBorrower) {
    return NextResponse.json(
      { error: `Borrower ${address} not found` },
      { status: 404 },
    )
  }
  const [, result] = await prisma.$transaction([
    prisma.borrowerProfileUpdateRequest.deleteMany({
      where: {
        chainId,
        address,
        acceptedAt: null,
        rejectedAt: null,
      },
    }),
    prisma.borrowerProfileUpdateRequest.create({
      data: {
        chainId,
        address,
        createdAt: new Date().toISOString(),
        name,
        description,
        founded,
        headquarters,
        website,
        twitter,
        linkedin,
        email,
      },
    }),
  ])
  return NextResponse.json({ success: true, updateId: result.id })
}

/// GET /api/profiles/updates?borrower=<borrower>&pending=<bool>
/// Get all pending updates for a borrower, or for all borrowers if none is provided
/// If pending is false, return all updates
export async function GET(request: NextRequest) {
  const borrower = request.nextUrl.searchParams.get("borrower") || undefined
  const pendingStr = request.nextUrl.searchParams.get("pending")
  const onlyPending = pendingStr === null || pendingStr === "true"
  const updates = await getBorrowerProfileUpdates(borrower, onlyPending)
  return NextResponse.json(updates)
}

/// PUT /api/profiles/updates
/// Accept or reject a borrower profile update
export async function PUT(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let data: BorrowerProfileUpdateResponse
  try {
    data = BorrowerProfileUpdateResponseDTO.parse(await request.json())
  } catch (error) {
    return getZodParseError(error)
  }

  const { accept, rejectedReason, updateId } = data

  const updateRequest = await prisma.borrowerProfileUpdateRequest.findFirst({
    where: {
      id: updateId,
    },
  })
  if (!updateRequest) {
    return NextResponse.json(
      { error: `Update request ${updateId} does not exist` },
      { status: 404 },
    )
  }

  const proms: Prisma.PrismaPromise<unknown>[] = []
  if (accept) {
    const newData: Omit<BorrowerProfileInput, "address"> = {}
    const keys = [
      "name",
      "description",
      "founded",
      "headquarters",
      "website",
      "twitter",
      "linkedin",
      "email",
    ] as const
    keys.forEach((key) => {
      if (updateRequest[key] !== null) {
        newData[key] = updateRequest[key]
      }
    })
    proms.push(
      prisma.borrower.update({
        where: {
          chainId_address: {
            address: updateRequest.address,
            chainId: updateRequest.chainId,
          },
        },
        data: newData,
      }),
      prisma.borrowerProfileUpdateRequest.update({
        where: {
          id: updateId,
        },
        data: {
          acceptedAt: new Date().toISOString(),
        },
      }),
    )
  } else {
    proms.push(
      prisma.borrowerProfileUpdateRequest.update({
        where: {
          id: updateId,
        },
        data: {
          rejectedAt: new Date().toISOString(),
          rejectedReason,
        },
      }),
    )
  }
  await prisma.$transaction(proms)

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

  const result = await prisma.borrowerProfileUpdateRequest.deleteMany({
    where: {
      chainId: TargetChainId,
      ...(borrower && { address: borrower }),
    },
  })

  return NextResponse.json({ success: true, deleted: result.count })
}

export const dynamic = "force-dynamic"
