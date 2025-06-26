import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import {
  BorrowerAdditionalUrl,
  BorrowerProfileInput,
} from "@/app/api/profiles/interface"
import { TargetChainId } from "@/config/network"
import { getBorrowerProfileUpdates, prisma } from "@/lib/db"
import { uploadProfilePicture } from "@/lib/upload-profile-picture"
import { getZodParseError } from "@/lib/zod-error"

import {
  BorrowerProfileInputDTO,
  BorrowerProfileUpdateResponseDTO,
} from "./dto"
import { BorrowerProfileUpdateResponse } from "./interface"
import { verifyApiToken } from "../../auth/verify-header"

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
    const {
      address: inputAddress,
      avatar: base64Avatar,
      ...input
    } = await request.json()
    // Admin can update profiles for any address
    const address = inputAddress && token.isAdmin ? inputAddress : token.address
    data = {
      ...BorrowerProfileInputDTO.parse(input),
      address,
    }
    if (base64Avatar) {
      const avatar = await uploadProfilePicture(base64Avatar, address)
      if (!avatar) {
        return NextResponse.json(
          { error: "Failed to upload profile picture" },
          { status: 500 },
        )
      }
      data.avatar = avatar
    }
  } catch (error) {
    return getZodParseError(error)
  }

  const {
    name,
    alias,
    avatar,
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
    additionalUrls,
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
        avatar,
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
        additionalUrls,
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
    "avatar",
    "description",
    "website",
    "twitter",
    "telegram",
    "linkedin",
    "email",
    "telegram",
    "additionalUrls",
  ] as const
  keys.forEach((key) => {
    if (key in data) {
      if (key === "additionalUrls") {
        // If the url has a protocol, ensure it is HTTPS. If it doesn't, add https://.
        data[key]?.forEach((link) => {
          if (link.url.startsWith("http://")) {
            link.url = link.url.replace("http://", "https://")
          } else if (!link.url.startsWith("https://")) {
            link.url = `https://${link.url}`
          }
        })
        newData[key] = data[key] || undefined
      } else {
        newData[key] = data[key] || null
      }
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
      data: newData as Omit<typeof newData, "additionalUrls"> & {
        additionalUrls?: ReadonlyArray<BorrowerAdditionalUrl>
      },
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
      "additionalUrls",
    ] as const
    keys.forEach((key) => {
      if (updateRequest[key] !== null) {
        if (key === "additionalUrls") {
          newData[key] =
            (updateRequest[key] as BorrowerAdditionalUrl[]) || undefined
        } else {
          newData[key] = updateRequest[key] || undefined
        }
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
