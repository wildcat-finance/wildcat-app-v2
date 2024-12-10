import { getArchControllerContract } from "@wildcatfi/wildcat-sdk"
import { keccak256, toUtf8Bytes } from "ethers/lib/utils"
import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { findBorrowerWithPendingInvitation, prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifySignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { AcceptInvitationInputDTO, BorrowerInvitationInputDTO } from "./dto"
import { AcceptInvitationInput, BorrowerInvitationInput } from "./interface"
import { verifyApiToken } from "../auth/verify-header"

/// GET /api/invite
/// Route to get borrower invitations.
/// Admin-only endpoint.
export async function GET(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const allInvitations = await prisma.borrowerInvitation.findMany({
    where: {
      chainId: TargetChainId,
    },
  })
  return NextResponse.json(allInvitations)
}

/// POST /api/invite
/// Route to create a new invitation for a borrower.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let body: BorrowerInvitationInput
  try {
    const input = await request.json()
    body = BorrowerInvitationInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const address = body.address.toLowerCase()
  const chainId = TargetChainId
  const { name } = body
  const inviter = token.address
  const existingBorrower = await prisma.borrower.findFirst({
    where: {
      chainId,
      address,
    },
  })

  const provider = getProviderForServer()
  const archController = getArchControllerContract(chainId, provider)

  if (!existingBorrower) {
    const isRegisteredBorrower =
      await archController.isRegisteredBorrower(address)
    await prisma.borrower.create({
      data: {
        chainId,
        address,
        name,
        registeredOnChain: isRegisteredBorrower,
        invitation: {
          create: {
            inviter,
            name,
            timeInvited: new Date().toISOString(),
          },
        },
      },
    })
  } else {
    const existingInvitation = await prisma.borrowerInvitation.findFirst({
      where: {
        chainId,
        address,
      },
    })
    if (existingInvitation) {
      return NextResponse.json(
        {
          error: `An invitation for ${address} already exists`,
        },
        { status: 400 },
      )
    }
    await prisma.borrowerInvitation.create({
      data: {
        chainId,
        address,
        inviter,
        name,
        timeInvited: new Date().toISOString(),
      },
    })
  }
  return NextResponse.json({ success: true })
}

/// DELETE /api/invite?address=<address>
/// Route to delete an invitation for a borrower.
/// Admin-only endpoint.
export async function DELETE(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const address = request.nextUrl.searchParams.get("address")
  if (!address) {
    return NextResponse.json(
      { success: false, message: "No address provided" },
      { status: 400 },
    )
  }
  const chainId = TargetChainId
  const result = await prisma.borrowerInvitation.deleteMany({
    where: {
      chainId,
      address,
    },
  })
  return NextResponse.json({ success: true, deleted: result.count })
}

/// PUT /api/invite
/// Route for accepting a borrower invitation.
/// Borrower-only endpoint but does not require login.
///
/// Borrower must provide:
/// address
/// name
/// signature
/// dateSigned
export async function PUT(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: AcceptInvitationInput
  try {
    const input = await request.json()
    body = AcceptInvitationInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const address = token.address.toLowerCase()
  const chainId = TargetChainId
  const { name, dateSigned, signature } = body
  const borrowerInvitation = await findBorrowerWithPendingInvitation(address)
  if (!borrowerInvitation) {
    return NextResponse.json(
      { error: `Pending borrower invitation not found for ${address}` },
      { status: 404 },
    )
  }
  let agreementText = AgreementText
  if (dateSigned) {
    agreementText = `${agreementText}\n\nDate: ${dateSigned}`
  }
  agreementText = `${agreementText}\n\nOrganization Name: ${name}`
  const provider = getProviderForServer()

  const result = await verifySignature({
    provider,
    signature,
    message: agreementText,
    address,
    allowSingleSafeOwner: false,
  })
  if (!result) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  console.log(`--- accept invite ---`)
  console.log("borrower", JSON.stringify(borrowerInvitation, null, 2))
  console.log(
    JSON.stringify(
      {
        network: chainId,
        signature,
        address,
        name,
        dateSigned,
      },
      null,
      2,
    ),
  )
  if (borrowerInvitation.name !== name) {
    await prisma.borrower.update({
      where: {
        chainId_address: {
          chainId,
          address,
        },
      },
      data: { name },
    })
  }
  await prisma.borrowerServiceAgreementSignature.create({
    data: {
      chainId,
      address,
      signature,
      timeSigned: dateSigned,
      borrowerName: name,
      serviceAgreementHash: keccak256(toUtf8Bytes(AgreementText)),
    },
  })
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
