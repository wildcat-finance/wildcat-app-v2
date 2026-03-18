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
import { logger } from "@/lib/logging/server"
import { getProviderForServer } from "@/lib/provider"
import { verifySignature } from "@/lib/signatures"
import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"
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
  return withServerSpan("api.invite.get", async (span) => {
    const chainId = validateChainIdParam(request)
    if (!chainId) {
      span.setAttribute("invite.result", "invalid_chain_id")
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
    span.setAttribute("market.chain_id", chainId)

    const token = await withServerSpan(
      "auth.token.verify_api_token",
      async () => verifyApiToken(request),
    )
    if (!token) {
      span.setAttribute("invite.result", "unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!token.isAdmin) {
      span.setAttribute("invite.result", "forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* const onlyPendingInvitations = request.nextUrl.searchParams.get(
      "onlyPendingInvitations",
    ) */
    await withServerSpan("invite.db.sync_registered_status", async () =>
      tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered(chainId),
    )
    const allInvitations = (
      await withServerSpan("invite.db.find_pending", async () =>
        findBorrowersWithPendingInvitations(chainId),
      )
    ).map(({ timeSigned, ...rest }) => ({
      ...rest,
      hasSignedServiceAgreement: !!timeSigned,
      timeSigned,
    })) as BorrowerInvitationForAdminView[]
    span.setAttributes({
      "invite.result": "ok",
      "invite.count": allInvitations.length,
    })
    return NextResponse.json(allInvitations)
  })
}

/// POST /api/invite
/// Route to create a new invitation for a borrower.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  return withServerSpan("api.invite.post", async (span) => {
    const token = await withServerSpan(
      "auth.token.verify_api_token",
      async () => verifyApiToken(request),
    )
    if (!token) {
      span.setAttribute("invite.result", "unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!token.isAdmin) {
      span.setAttribute("invite.result", "forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: BorrowerInvitationInput
    try {
      const input = await request.json()
      body = BorrowerInvitationInputDTO.parse(input)
      if (!isSupportedChainId(body.chainId)) {
        span.setAttribute("invite.result", "invalid_chain_id")
        return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
      }
    } catch (error) {
      span.setAttribute("invite.result", "invalid_payload")
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
    span.setAttributes({
      "market.chain_id": chainId,
      "borrower.address": address,
    })
    const inviter = token.address
    const existingBorrower = await withServerSpan(
      "invite.db.get_borrower",
      async () =>
        prisma.borrower.findFirst({
          where: {
            chainId,
            address,
          },
        }),
    )

    const provider = getProviderForServer(chainId)
    const archController = getArchControllerContract(chainId, provider)

    if (!existingBorrower) {
      const isRegisteredBorrower = await withServerSpan(
        "invite.chain.is_registered_borrower",
        async () => archController.isRegisteredBorrower(address),
      )
      await withServerSpan(
        "invite.db.create_borrower_with_invitation",
        async () =>
          prisma.borrower.create({
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
          }),
      )
    } else {
      const existingInvitation = await withServerSpan(
        "invite.db.get_invitation",
        async () =>
          prisma.borrowerInvitation.findFirst({
            where: {
              chainId,
              address,
            },
          }),
      )
      if (existingInvitation) {
        span.setAttribute("invite.result", "already_exists")
        return NextResponse.json(
          {
            error: `An invitation for ${address} already exists`,
          },
          { status: 400 },
        )
      }
      await withServerSpan("invite.db.create_invitation", async () =>
        prisma.borrowerInvitation.create({
          data: {
            chainId,
            address,
            inviter,
            name,
            alias,
            timeInvited: new Date().toISOString(),
          },
        }),
      )
    }
    span.setAttribute("invite.result", "created")
    return NextResponse.json({ success: true })
  })
}

/// DELETE /api/invite?address=<address>&chainId=<chainId>
/// Route to delete an invitation for a borrower.
/// Admin-only endpoint.
export async function DELETE(request: NextRequest) {
  return withServerSpan("api.invite.delete", async (span) => {
    const token = await withServerSpan(
      "auth.token.verify_api_token",
      async () => verifyApiToken(request),
    )
    if (!token) {
      span.setAttribute("invite.result", "unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!token.isAdmin) {
      span.setAttribute("invite.result", "forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const address = request.nextUrl.searchParams.get("address")
    const chainId = validateChainIdParam(request)
    if (!chainId) {
      span.setAttribute("invite.result", "invalid_chain_id")
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
    if (!address) {
      span.setAttribute("invite.result", "missing_address")
      return NextResponse.json(
        { success: false, message: "No address provided" },
        { status: 400 },
      )
    }
    span.setAttributes({
      "market.chain_id": chainId,
      "borrower.address": address,
    })

    const borrower = await withServerSpan(
      "invite.db.get_pending_borrower",
      async () => findBorrowerWithPendingInvitation(address, chainId),
    )
    await withServerSpan("invite.db.delete_invitation", async () =>
      prisma.borrowerInvitation.delete({
        where: {
          chainId_address: {
            chainId,
            address,
          },
        },
      }),
    )
    if (borrower) {
      // Delete borrower as well as invitation
      await withServerSpan("invite.db.delete_borrower", async () =>
        prisma.borrower.delete({
          where: {
            chainId_address: {
              chainId,
              address,
            },
          },
        }),
      )
    }
    span.setAttribute("invite.result", "deleted")
    return NextResponse.json({ success: true })
  })
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
  return withServerSpan("api.invite.put", async (span) => {
    const token = await withServerSpan(
      "auth.token.verify_api_token",
      async () => verifyApiToken(request),
    )
    if (!token) {
      span.setAttribute("invite.result", "unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: AcceptInvitationInput
    try {
      const input = await request.json()
      body = AcceptInvitationInputDTO.parse(input)
      if (!isSupportedChainId(body.chainId)) {
        span.setAttribute("invite.result", "invalid_chain_id")
        return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
      }
    } catch (error) {
      span.setAttribute("invite.result", "invalid_payload")
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
    span.setAttributes({
      "market.chain_id": chainId,
      "borrower.address": address,
    })
    logger.info(
      {
        name,
        entityKind,
        timeSigned,
        address,
        chainId,
      },
      "Accept invite payload",
    )

    const borrowerInvitation = await withServerSpan(
      "invite.db.get_pending_borrower",
      async () => findBorrowerWithPendingInvitation(address, chainId),
    )
    if (!borrowerInvitation || borrowerInvitation.timeSigned) {
      span.setAttribute("invite.result", "pending_invite_not_found")
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

    const result = await withServerSpan("invite.signature.verify", async () =>
      verifySignature({
        provider,
        signature,
        message: agreementText,
        address,
        allowSingleSafeOwner: false,
      }),
    )
    if (!result) {
      span.setAttribute("invite.result", "invalid_signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    logger.info({ address, chainId }, "Accept invite verified")
    if (
      borrowerInvitation.name !== name ||
      borrowerInvitation.description !== description ||
      borrowerInvitation.entityKind !== entityKind ||
      borrowerInvitation.founded !== founded ||
      borrowerInvitation.headquarters !== headquarters ||
      borrowerInvitation.jurisdiction !== jurisdiction ||
      borrowerInvitation.physicalAddress !== physicalAddress
    ) {
      await withServerSpan("invite.db.update_borrower_profile", async () =>
        prisma.borrower.update({
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
        }),
      )
    }
    await withServerSpan(
      "invite.db.create_service_agreement_signature",
      async () =>
        prisma.borrowerServiceAgreementSignature.create({
          data: {
            chainId,
            address,
            signature,
            timeSigned: new Date(timeSigned),
            borrowerName: name,
            serviceAgreementHash: keccak256(toUtf8Bytes(AgreementText)),
          },
        }),
    )
    span.setAttribute("invite.result", "accepted")
    return NextResponse.json({ success: true })
  })
}

export const dynamic = "force-dynamic"
