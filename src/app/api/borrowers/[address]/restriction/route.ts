import { getArchControllerContract } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  applyRemovalTransition,
  getBorrowerRestriction,
  getBorrowerRestrictionRow,
  setRestrictionOverride,
} from "@/lib/borrowerRestriction"
import { getProviderForServer } from "@/lib/provider"
import { notifySlack } from "@/lib/slack"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"
import { computeBorrowerRestriction } from "@/utils/borrowerRestrictionState"

import { isAdminForChain, verifyApiToken } from "../../../auth/verify-header"

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

const validateAddressParam = (address: string): string | undefined =>
  ADDRESS_PATTERN.test(address) ? address.toLowerCase() : undefined

/// GET /api/borrowers/[address]/restriction?chainId=<chainId>
/// Computed restriction state for a borrower. Public: the state is derived
/// from public onchain facts plus an internal override whose value is only
/// exposed as its effect.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = validateAddressParam(params.address)
  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }
  const state = await getBorrowerRestriction(chainId, address)
  return NextResponse.json(state)
}

/// POST /api/borrowers/[address]/restriction?chainId=<chainId>
/// Self-verifying sync: reads the archcontroller's isRegisteredBorrower view
/// with the server's own provider and persists the resulting transition.
/// Callers supply nothing but the address, so the route cannot be used to
/// plant state; it is idempotent and unauthenticated by design.
export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = validateAddressParam(params.address)
  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }
  const row = await getBorrowerRestrictionRow(chainId, address)
  if (!row.exists) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 })
  }
  let isRegisteredOnChain: boolean
  try {
    isRegisteredOnChain = await getArchControllerContract(
      chainId,
      getProviderForServer(chainId),
    ).isRegisteredBorrower(address)
  } catch (error) {
    // Fail closed: an unreachable chain changes nothing.
    console.error("restriction sync: archcontroller read failed", error)
    return NextResponse.json(
      { error: "Archcontroller read failed" },
      { status: 502 },
    )
  }
  const transition = await applyRemovalTransition(
    chainId,
    address,
    isRegisteredOnChain,
  )
  if (transition?.notifyRestriction) {
    // Notification failure must not fail the persisted transition.
    await notifySlack(
      `Borrower ${address} (chain ${chainId}) was removed from the ` +
        `archcontroller; app actions are now restricted. (product#789)`,
    )
  }
  const state = await getBorrowerRestriction(chainId, address)
  return NextResponse.json({ ...state, changed: transition !== null })
}

const OverrideDTO = z.object({
  override: z.enum(["restricted", "cleared"]).nullable(),
})

/// PUT /api/borrowers/[address]/restriction?chainId=<chainId>
/// Admin-only manual override; takes precedence over the onchain-derived
/// flag. Body: { override: "restricted" | "cleared" | null }.
export async function PUT(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = validateAddressParam(params.address)
  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let override: "restricted" | "cleared" | null
  try {
    override = OverrideDTO.parse(await request.json()).override
  } catch (error) {
    return getZodParseError(error)
  }
  const row = await getBorrowerRestrictionRow(chainId, address)
  if (!row.exists) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 })
  }
  await setRestrictionOverride(chainId, address, override, token.address)
  if (override === "restricted") {
    await notifySlack(
      `Admin ${token.address} manually restricted borrower ${address} ` +
        `(chain ${chainId}). (product#789)`,
    )
  }
  const state = computeBorrowerRestriction({
    removedFromArchController: row.removedFromArchController,
    restrictionOverride: override,
  })
  return NextResponse.json(state)
}

export const dynamic = "force-dynamic"
