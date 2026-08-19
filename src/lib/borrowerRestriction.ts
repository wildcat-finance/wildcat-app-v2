/// Persistence helpers for the borrower restriction flag (product#789).
/// The pure rules live in src/utils/borrowerRestrictionState.ts; this file
/// is the only place the flag is read from or written to the database.

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  BorrowerRestrictionInputs,
  BorrowerRestrictionState,
  computeBorrowerRestriction,
  computeRemovalTransition,
  isRestrictionOverride,
  RestrictionOverride,
} from "@/utils/borrowerRestrictionState"

import { prisma } from "./db"

export interface BorrowerRestrictionRow extends BorrowerRestrictionInputs {
  exists: boolean
  removedAt: Date | null
  restrictionOverrideBy: string | null
  restrictionOverrideAt: Date | null
}

export async function getBorrowerRestrictionRow(
  chainId: SupportedChainId,
  address: string,
): Promise<BorrowerRestrictionRow> {
  const row = await prisma.borrower.findUnique({
    where: { chainId_address: { chainId, address: address.toLowerCase() } },
    select: {
      removedFromArchController: true,
      removedAt: true,
      restrictionOverride: true,
      restrictionOverrideBy: true,
      restrictionOverrideAt: true,
    },
  })
  if (!row) {
    return {
      exists: false,
      removedFromArchController: false,
      removedAt: null,
      restrictionOverride: null,
      restrictionOverrideBy: null,
      restrictionOverrideAt: null,
    }
  }
  return {
    exists: true,
    removedFromArchController: row.removedFromArchController,
    removedAt: row.removedAt,
    restrictionOverride: isRestrictionOverride(row.restrictionOverride)
      ? row.restrictionOverride
      : null,
    restrictionOverrideBy: row.restrictionOverrideBy,
    restrictionOverrideAt: row.restrictionOverrideAt,
  }
}

export async function getBorrowerRestriction(
  chainId: SupportedChainId,
  address: string,
): Promise<BorrowerRestrictionState> {
  return computeBorrowerRestriction(
    await getBorrowerRestrictionRow(chainId, address),
  )
}

/// Applies the removal transition for a borrower given the answer of an
/// archcontroller isRegisteredBorrower call the caller just made. Returns
/// the transition that was written, or null when nothing changed.
export async function applyRemovalTransition(
  chainId: SupportedChainId,
  address: string,
  isRegisteredOnChain: boolean,
): Promise<{ removedFromArchController: boolean; notifyRestriction: boolean } | null> {
  const row = await getBorrowerRestrictionRow(chainId, address)
  if (!row.exists) return null
  const transition = computeRemovalTransition({ ...row, isRegisteredOnChain })
  if (!transition) return null
  await prisma.borrower.update({
    where: { chainId_address: { chainId, address: address.toLowerCase() } },
    data: {
      removedFromArchController: transition.removedFromArchController,
      removedAt: transition.removedFromArchController ? new Date() : null,
    },
  })
  return transition
}

export async function setRestrictionOverride(
  chainId: SupportedChainId,
  address: string,
  override: RestrictionOverride | null,
  setBy: string,
): Promise<void> {
  await prisma.borrower.update({
    where: { chainId_address: { chainId, address: address.toLowerCase() } },
    data: {
      restrictionOverride: override,
      restrictionOverrideBy: override === null ? null : setBy.toLowerCase(),
      restrictionOverrideAt: override === null ? null : new Date(),
    },
  })
}
