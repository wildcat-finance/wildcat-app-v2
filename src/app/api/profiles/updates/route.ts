import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import {
  BorrowerProfile,
  BorrowerProfileInput,
} from "@/app/api/profiles/interface"
import { TargetChainId } from "@/config/network"
import { getBorrowerProfileUpdates, prisma } from "@/lib/db"
import { getZodParseError } from "@/lib/zod-error"

import {
  BorrowerProfileInputDTO,
  BorrowerProfileUpdateResponseDTO,
} from "./dto"
import { BorrowerProfileUpdateResponse } from "./interface"
import { verifyApiToken } from "../../auth/verify-header"

const mockProfile: BorrowerProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute",
  alias: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: "wintermute_t",
  linkedin: "https://uk.linkedin.com/company/wintermute-trading",
  jurisdiction: "UK",
  entityKind: "llc",
  physicalAddress: "48 Station Road, London, N73 8QA",
  email: "example@domain.com",
  chainId: TargetChainId,
  registeredOnChain: true,
}

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
    const { address: inputAddress, ...input } = await request.json()
    // Admin can update profiles for any address
    const address = inputAddress && token.isAdmin ? inputAddress : token.address
    data = {
      ...BorrowerProfileInputDTO.parse(input),
      address,
    }
  } catch (error) {
    return getZodParseError(error)
  }

  const {
    name,
    alias,
    description,
    founded,
    headquarters,
    website,
    twitter,
    telegram,
    linkedin,
    email,
    jurisdiction,
    physicalAddress,
    entityKind,
  } = data

  const address = data.address.toLowerCase()
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
  const [, updateRequest] = await prisma.$transaction([
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
        alias,
        description,
        founded,
        headquarters,
        website,
        twitter,
        telegram,
        linkedin,
        email,
        jurisdiction,
        physicalAddress,
        entityKind,
      },
    }),
  ])

  // @todo Temporarily apply changes immediately
  const newData: {
    [key in keyof Omit<BorrowerProfileInput, "address">]?:
      | BorrowerProfileInput[key]
      | null
  } = {}
  const keys = [
    ...(token.isAdmin
      ? ([
          "name",
          "alias",
          "founded",
          "headquarters",
          "jurisdiction",
          "physicalAddress",
          "entityKind",
        ] as const)
      : []),
    "description",
    "website",
    "twitter",
    "telegram",
    "linkedin",
    "email",
    "telegram",
  ] as const
  keys.forEach((key) => {
    if (key in data) {
      newData[key] = data[key] || null
    }
  })
  await Promise.all([
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
        id: updateRequest.id,
      },
      data: {
        acceptedAt: new Date().toISOString(),
      },
    }),
  ])

  return NextResponse.json({ success: true, updateId: updateRequest.id })
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
      "alias",
      "description",
      "founded",
      "headquarters",
      "website",
      "twitter",
      "telegram",
      "linkedin",
      "email",
      "jurisdiction",
      "physicalAddress",
      "entityKind",
    ] as const
    keys.forEach((key) => {
      if (updateRequest[key] !== null) {
        newData[key] = updateRequest[key] || undefined
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
      { success: false, message: "No Borrower Provided" },
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
