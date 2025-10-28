import {
  getArchControllerContract,
  isSupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { keccak256, toUtf8Bytes } from "ethers/lib/utils"
import { NextRequest, NextResponse } from "next/server"

import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import {
  findBorrowersWithPendingInvitations,
  findBorrowerWithPendingInvitation,
  prisma,
  tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered,
} from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifySignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"
import { formatUnixMsAsDate } from "@/utils/formatters"

import { AcceptInvitationInputDTO, BorrowerInvitationInputDTO } from "./dto"
import {
  AcceptInvitationInput,
  BorrowerInvitationForAdminView,
  BorrowerInvitationInput,
} from "./interface"
import { verifyApiToken } from "../auth/verify-header"

/// GET /api/invite
/// Route to get borrower invitations.
/// Admin-only endpoint.
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  /* const onlyPendingInvitations = request.nextUrl.searchParams.get(
    "onlyPendingInvitations",
  ) */
  await tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered(chainId)
  const allInvitations = (
    await findBorrowersWithPendingInvitations(chainId)
  ).map(({ timeSigned, ...rest }) => ({
    ...rest,
    hasSignedServiceAgreement: !!timeSigned,
    timeSigned,
  })) as BorrowerInvitationForAdminView[]
  return NextResponse.json(allInvitations)
}

/// POST /api/invite
/// Route to create a new invitation for a borrower.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let body: BorrowerInvitationInput
  try {
    const input = await request.json()
    body = BorrowerInvitationInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const address = body.address.toLowerCase()
  const {
    name,
    chainId,
    alias,
    description,
    entityKind,
    founded,
    headquarters,
    jurisdiction,
    physicalAddress,
  } = body
  const inviter = token.address
  const existingBorrower = await prisma.borrower.findFirst({
    where: {
      chainId,
      address,
    },
  })

  const provider = getProviderForServer(chainId)
  const archController = getArchControllerContract(chainId, provider)

  if (!existingBorrower) {
    const isRegisteredBorrower =
      await archController.isRegisteredBorrower(address)
    await prisma.borrower.create({
      data: {
        chainId,
        address,
        name,
        alias,
        description,
        entityKind,
        founded,
        headquarters,
        jurisdiction,
        physicalAddress,
        registeredOnChain: isRegisteredBorrower,
        invitation: {
          create: {
            inviter,
            name,
            alias,
            description,
            entityKind,
            founded,
            headquarters,
            jurisdiction,
            physicalAddress,
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
        alias,
        timeInvited: new Date().toISOString(),
      },
    })
  }
  return NextResponse.json({ success: true })
}

/* const invitations = await prisma.borrowerInvitation.findMany({
      where: {
        chainId: TargetChainId,
        borrower: {
          OR: [
            {
              entityKind: null,
            },
            {
              jurisdiction: null,
            },
            {
              physicalAddress: null,
            },
          ],
        },
      },
      include: {
        borrower: {
          select: {
            registeredOnChain: true,
            serviceAgreementSignature: true,
            name: true,
            entityKind: true,
            jurisdiction: true,
            physicalAddress: true,
          },
        },
      },
    })

    // eslint-disable-next-line no-restricted-syntax
    for (const invitation of invitations) {
      const missingFields = []
      if (!invitation.borrower?.name) missingFields.push("name")
      if (!invitation.borrower?.entityKind) missingFields.push("entityKind")
      if (!invitation.borrower?.jurisdiction) missingFields.push("jurisdiction")
      if (!invitation.borrower?.physicalAddress)
        missingFields.push("physicalAddress")
      console.log(
        `${invitation.address.slice(0, 10)}... | Name: ${
          invitation.name
        } | MISSING ${missingFields.join(", ")} | Registered: ${invitation
          .borrower?.registeredOnChain} | Signed: ${!!invitation.borrower
          ?.serviceAgreementSignature}`,
      )
    }
    await prisma.$transaction([
      ...invitations.map(({ address }) =>
        prisma.borrowerInvitation.delete({
          where: {
            chainId_address: {
              chainId: TargetChainId,
              address,
            },
          },
        }),
      ),
      ...invitations.map(({ address }) =>
        prisma.borrower.delete({
          where: {
            chainId_address: {
              chainId: TargetChainId,
              address,
            },
          },
        }),
      ),
    ]) */

/// DELETE /api/invite?address=<address>&chainId=<chainId>
/// Route to delete an invitation for a borrower.
/// Admin-only endpoint.
export async function DELETE(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const address = request.nextUrl.searchParams.get("address")
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  if (!address) {
    return NextResponse.json(
      { success: false, message: "No address provided" },
      { status: 400 },
    )
  }
  const borrower = await findBorrowerWithPendingInvitation(address, chainId)
  await prisma.borrowerInvitation.delete({
    where: {
      chainId_address: {
        chainId,
        address,
      },
    },
  })
  if (borrower) {
    // Delete borrower as well as invitation
    await prisma.borrower.delete({
      where: {
        chainId_address: {
          chainId,
          address,
        },
      },
    })
  }
  return NextResponse.json({ success: true })
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
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const address = token.address.toLowerCase()
  const {
    chainId,
    name,
    description,
    entityKind,
    founded,
    headquarters,
    jurisdiction,
    physicalAddress,
    timeSigned,
    signature,
  } = body
  console.log({
    name,
    description,
    entityKind,
    founded,
    headquarters,
    jurisdiction,
    physicalAddress,
    timeSigned,
    signature,
    address,
  })

  const borrowerInvitation = await findBorrowerWithPendingInvitation(
    address,
    chainId,
  )
  if (!borrowerInvitation || borrowerInvitation.timeSigned) {
    return NextResponse.json(
      { error: `Pending borrower invitation not found for ${address}` },
      { status: 404 },
    )
  }
  let agreementText = AgreementText
  if (timeSigned) {
    const dateSigned = formatUnixMsAsDate(timeSigned)
    agreementText = `${agreementText}\n\nDate: ${dateSigned}`
  }
  agreementText = `${agreementText}\n\nOrganization Name: ${name}`
  const provider = getProviderForServer(chainId)

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
        timeSigned,
      },
      null,
      2,
    ),
  )
  if (
    borrowerInvitation.name !== name ||
    borrowerInvitation.description !== description ||
    borrowerInvitation.entityKind !== entityKind ||
    borrowerInvitation.founded !== founded ||
    borrowerInvitation.headquarters !== headquarters ||
    borrowerInvitation.jurisdiction !== jurisdiction ||
    borrowerInvitation.physicalAddress !== physicalAddress
  ) {
    await prisma.borrower.update({
      where: {
        chainId_address: {
          chainId,
          address,
        },
      },
      data: {
        name,
        description,
        entityKind,
        founded,
        headquarters,
        jurisdiction,
        physicalAddress,
      },
    })
  }
  await prisma.borrowerServiceAgreementSignature.create({
    data: {
      chainId,
      address,
      signature,
      timeSigned: new Date(timeSigned),
      borrowerName: name,
      serviceAgreementHash: keccak256(toUtf8Bytes(AgreementText)),
    },
  })
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
