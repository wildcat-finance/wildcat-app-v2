import {
  getArchControllerContract,
  isSupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import {
  deleteBorrowerRegistrations,
  findBorrowersWithPendingInvitations,
  findBorrowerWithPendingInvitation,
  prisma,
  tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered,
} from "@/lib/db"
import { isTestnetChain } from "@/lib/networkClass"
import { getProviderForServer } from "@/lib/provider"
import { tryResolveRegisteredBy } from "@/lib/registrar"
import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
  saveServiceAgreementSignature,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { AcceptInvitationInputDTO, BorrowerInvitationInputDTO } from "./dto"
import {
  AcceptInvitationInput,
  BorrowerInvitationForAdminView,
  BorrowerInvitationInput,
} from "./interface"
import { isAdminForChain, verifyApiToken } from "../auth/verify-header"

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
  if (!(await isAdminForChain(token, chainId))) {
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
/// Route to invite an address to borrow on one network.
/// With `borrowerId`, the address joins that existing organisation; otherwise a
/// new organisation is created from the profile fields.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
  if (!(await isAdminForChain(token, body.chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const address = body.address.toLowerCase()
  const {
    name,
    chainId,
    borrowerId,
    alias,
    description,
    entityKind,
    founded,
    headquarters,
    jurisdiction,
    physicalAddress,
  } = body
  const isTestnet = isTestnetChain(chainId)
  const invitation = { invitedBy: token.address, invitedAt: new Date() }

  const existingRegistration = await prisma.borrowerRegistration.findUnique({
    where: { chainId_address: { chainId, address } },
  })
  if (existingRegistration) {
    if (existingRegistration.invitedAt) {
      return NextResponse.json(
        {
          error: `An invitation for ${address} already exists`,
        },
        { status: 400 },
      )
    }
    if (borrowerId && borrowerId !== existingRegistration.borrowerId) {
      return NextResponse.json(
        {
          error: `${address} already acts for another borrower on this network`,
        },
        { status: 400 },
      )
    }
    await prisma.borrowerRegistration.update({
      where: { chainId_address: { chainId, address } },
      data: invitation,
    })
    return NextResponse.json({ success: true })
  }

  if (borrowerId) {
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      select: { isTestnet: true },
    })
    if (!borrower || borrower.isTestnet !== isTestnet) {
      return NextResponse.json(
        { error: `Borrower ${borrowerId} not found for this network` },
        { status: 400 },
      )
    }
  }

  const provider = getProviderForServer(chainId)
  const archController = getArchControllerContract(chainId, provider)
  const isRegisteredBorrower =
    await archController.isRegisteredBorrower(address)
  const registeredBy = isRegisteredBorrower
    ? await tryResolveRegisteredBy(chainId, address, provider)
    : undefined
  const registration = {
    chainId,
    address,
    isTestnet,
    registeredOnChain: isRegisteredBorrower,
    checkedAt: new Date(),
    ...(registeredBy ? { registeredBy } : {}),
    ...invitation,
  }
  await prisma.$transaction(async (transaction) => {
    const organisationId =
      borrowerId ??
      (
        await transaction.borrower.create({
          data: {
            isTestnet,
            name,
            alias,
            description,
            entityKind,
            founded,
            headquarters,
            jurisdiction,
            physicalAddress,
          },
          select: { id: true },
        })
      ).id
    await transaction.borrowerRegistration.create({
      data: { ...registration, borrowerId: organisationId },
    })
  })
  return NextResponse.json({ success: true })
}

/// DELETE /api/invite?address=<address>&chainId=<chainId>
/// Route to delete an invitation for a borrower.
/// An address that has not completed onboarding loses its registration on this
/// network, with its ToU rows; an organisation left with no registration goes too.
/// Admin-only endpoint.
export async function DELETE(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const address = request.nextUrl.searchParams.get("address")
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!address) {
    return NextResponse.json(
      { success: false, message: "No address provided" },
      { status: 400 },
    )
  }
  const borrowerAddress = address.toLowerCase()
  const registration = await prisma.borrowerRegistration.findUnique({
    where: { chainId_address: { chainId, address: borrowerAddress } },
    select: { invitedAt: true },
  })
  if (!registration?.invitedAt) {
    return NextResponse.json(
      { success: false, message: `No invitation for ${borrowerAddress}` },
      { status: 404 },
    )
  }
  const pendingInvitation = await findBorrowerWithPendingInvitation(
    borrowerAddress,
    chainId,
  )
  if (pendingInvitation) {
    await deleteBorrowerRegistrations({ chainId, address: borrowerAddress })
  } else {
    await prisma.borrowerRegistration.update({
      where: { chainId_address: { chainId, address: borrowerAddress } },
      data: { invitedBy: null, invitedAt: null },
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
  if (token.chainId !== chainId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // Do not enable this in production: it exposes borrower profile fields and
  // raw signatures in server logs.
  // console.log({
  //   name,
  //   description,
  //   entityKind,
  //   founded,
  //   headquarters,
  //   jurisdiction,
  //   physicalAddress,
  //   timeSigned,
  //   signature,
  //   address,
  // })

  const agreement = await getCurrentServiceAgreement()
  const existingAcceptance = await prisma.serviceAgreementSignature.findUnique({
    where: {
      chainId_address_party_serviceAgreementId: {
        chainId,
        address,
        party: "Borrower",
        serviceAgreementId: agreement.id,
      },
    },
  })
  if (existingAcceptance) {
    if (
      existingAcceptance.signature === signature &&
      existingAcceptance.timeSigned.getTime() === timeSigned
    ) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(
      { error: "Invitation has already been accepted" },
      { status: 409 },
    )
  }

  // After the idempotent-replay check so retries of an already-stored action
  // still succeed; before verification so a new record can only claim a
  // signing time the server clock roughly agrees with.
  if (!isServiceAgreementTimeSignedInBounds(timeSigned)) {
    return NextResponse.json(
      { error: "timeSigned is outside the accepted signing window" },
      { status: 400 },
    )
  }

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
  const verified = await verifyServiceAgreementSignature({
    agreement,
    chainId,
    address,
    party: "Borrower",
    signature,
    timeSigned,
    organizationName: name,
    borrowerId: borrowerInvitation.borrowerId,
  })
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  // Do not enable this in production: it exposes borrower invitation details
  // and raw signatures in server logs.
  // console.log(`--- accept invite ---`)
  // console.log("borrower", JSON.stringify(borrowerInvitation, null, 2))
  // console.log(
  //   JSON.stringify(
  //     {
  //       network: chainId,
  //       signature,
  //       address,
  //       name,
  //       timeSigned,
  //     },
  //     null,
  //     2,
  //   ),
  // )
  await prisma.$transaction(async (transaction) => {
    if (
      borrowerInvitation.name !== name ||
      borrowerInvitation.description !== description ||
      borrowerInvitation.entityKind !== entityKind ||
      borrowerInvitation.founded !== founded ||
      borrowerInvitation.headquarters !== headquarters ||
      borrowerInvitation.jurisdiction !== jurisdiction ||
      borrowerInvitation.physicalAddress !== physicalAddress
    ) {
      await transaction.borrower.update({
        where: { id: borrowerInvitation.borrowerId },
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
    // Save the profile and its signed acknowledgement atomically.
    await saveServiceAgreementSignature(verified, transaction)
  })
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
