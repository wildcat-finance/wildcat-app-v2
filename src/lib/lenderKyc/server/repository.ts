import { randomBytes, randomUUID } from "crypto"

import {
  LenderKycOutcome as DbLenderKycOutcome,
  LenderKycProfileRevision as DbLenderKycProfileRevision,
  LenderKycSignatureKind,
  LenderKycStart as DbLenderKycStart,
  Prisma,
  PrismaClient,
} from "@prisma/client"

import { LENDER_TYPES, LenderType } from "@/config/lender-kyc"
import {
  areLenderKycDetailsEqual,
  isLenderKycDetailsEmpty,
  LenderKycDetails,
  LenderKycMessageKind,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"

import { decryptLenderKycField, encryptLenderKycField } from "./crypto"
import {
  LenderKycDetailsResult,
  LenderKycNotSignedReason,
  LenderKycOutcome,
  LenderKycSavedProfile,
  LenderKycStart,
  LenderKycStartResult,
  LenderKycStartSource,
  LenderKycWalletRow,
  LenderKycWalletStatus,
} from "../types"

export type LenderKycNonceRecord = {
  nonce: string
  chainId: number
  address: string
  secretHash: string
  issuedAt: Date
  expiresAt: Date
  usedAt: Date | null
}

export type LenderKycSignedRecord = {
  startId: string
  messageKind: LenderKycMessageKind
  chainId: number
  address: string
  signer: string
  signatureKind: LenderKycSignatureKind
  blockNumber: number | null
  nonce: string
  timeSigned: Date
  signature: string
  signedMessage: string
  termsVersion: string
}

export type LenderKycStoredSignature = {
  messageKind: LenderKycMessageKind
  outcome: LenderKycOutcome
  chainId: number
  address: string
  signature: string
  signedMessage: string
  createdAt: Date
}

export class LenderKycConflictError extends Error {
  constructor(readonly reason: "nonceConsumed" | "noSavedProfile") {
    super(
      reason === "nonceConsumed"
        ? "Nonce already used"
        : "No saved record for this wallet",
    )
  }
}

export type LenderKycRepository = {
  createStart(input: {
    address: string
    chainId: number
    source: LenderKycStartSource
  }): Promise<LenderKycStartResult>
  getWalletStatus(
    address: string,
    chainId: number,
  ): Promise<LenderKycWalletStatus>
  findStart(startId: string): Promise<LenderKycStart | undefined>
  discardStart(startId: string): Promise<void>
  recordClosed(startId: string): Promise<void>
  recordNotSigned(
    startId: string,
    reason: LenderKycNotSignedReason,
  ): Promise<void>
  recordForward(startId: string): Promise<void>
  recordReplayOutcome(startId: string, outcome: LenderKycOutcome): Promise<void>
  issueNonce(input: {
    address: string
    chainId: number
    secretHash: string
    expiresAt: Date
  }): Promise<LenderKycNonceRecord>
  findNonce(nonce: string): Promise<LenderKycNonceRecord | undefined>
  findSignatureByNonce(
    nonce: string,
  ): Promise<LenderKycStoredSignature | undefined>
  getVisibleProfile(
    address: string,
    chainId: number,
  ): Promise<LenderKycSavedProfile | undefined>
  recordSignedDetails(
    signed: LenderKycSignedRecord,
    details: LenderKycDetails,
  ): Promise<LenderKycDetailsResult>
  recordOwnership(signed: LenderKycSignedRecord): Promise<LenderKycSavedProfile>
  listWalletRows(chainId: number): Promise<LenderKycWalletRow[]>
  closeStaleStarts(clickedBefore: Date, chainId?: number): Promise<number>
}

type Client = PrismaClient | Prisma.TransactionClient

const SUCCESS_OUTCOMES: DbLenderKycOutcome[] = [
  "submitted",
  "updated",
  "unchanged",
  "skipped",
]

const toStart = (row: DbLenderKycStart): LenderKycStart => ({
  id: row.id,
  address: row.address,
  chainId: row.chainId,
  source: row.source,
  clickedAt: row.clickedAt.toISOString(),
  outcome: row.outcome ?? undefined,
  outcomeReason: row.outcomeReason ?? undefined,
  outcomeAt: row.outcomeAt?.toISOString(),
  forwardedAt: row.forwardedAt?.toISOString(),
})

const toLenderType = (value: string | null): LenderType | "" =>
  value && (LENDER_TYPES as readonly string[]).includes(value)
    ? (value as LenderType)
    : ""

const toProfile = (row: DbLenderKycProfileRevision): LenderKycSavedProfile => ({
  details: {
    fullName: decryptLenderKycField("fullName", row.id, row.fullName),
    email: decryptLenderKycField("email", row.id, row.email),
    companyName: decryptLenderKycField("companyName", row.id, row.companyName),
    lenderType: toLenderType(row.lenderType),
  },
  savedAt: row.savedAt.toISOString(),
})

const readRevisionDetails = (
  row: DbLenderKycProfileRevision,
): Pick<LenderKycWalletRow, "details" | "detailsUnreadable"> => {
  try {
    return { details: toProfile(row).details }
  } catch {
    return {
      detailsUnreadable: true,
      details: {
        fullName: "",
        email: "",
        companyName: "",
        lenderType: toLenderType(row.lenderType),
      },
    }
  }
}

const findVisibleRevision = (
  client: Client,
  address: string,
  chainId: number,
) =>
  client.lenderKycProfileRevision.findFirst({
    where: { address, chainId },
    orderBy: { savedAt: "desc" },
  })

const burnNonce = async (
  client: Prisma.TransactionClient,
  nonce: string,
  now: Date,
) => {
  const { count } = await client.lenderKycNonce.updateMany({
    where: { nonce, usedAt: null },
    data: { usedAt: now },
  })
  if (count !== 1) throw new LenderKycConflictError("nonceConsumed")
}

const createSignature = (
  client: Prisma.TransactionClient,
  signed: LenderKycSignedRecord,
  outcome: LenderKycOutcome,
  now: Date,
) => {
  const id = randomUUID()
  return client.lenderKycSignature.create({
    data: {
      id,
      startId: signed.startId,
      messageKind: signed.messageKind,
      outcome,
      chainId: signed.chainId,
      address: signed.address,
      signer: signed.signer,
      signatureKind: signed.signatureKind,
      blockNumber: signed.blockNumber,
      nonce: signed.nonce,
      timeSigned: signed.timeSigned,
      signature: encryptLenderKycField("signature", id, signed.signature),
      signedMessage: encryptLenderKycField(
        "signedMessage",
        id,
        signed.signedMessage,
      ),
      termsVersion: signed.termsVersion,
      createdAt: now,
    },
  })
}

const setStartOutcome = (
  client: Prisma.TransactionClient,
  startId: string,
  outcome: LenderKycOutcome,
  now: Date,
) =>
  client.lenderKycStart.update({
    where: { id: startId },
    data: { outcome, outcomeReason: null, outcomeAt: now },
  })

const groupByAddress = <T extends { address: string }>(rows: T[]) => {
  const groups = new Map<string, T[]>()
  rows.forEach((row) => {
    const group = groups.get(row.address)
    if (group) group.push(row)
    else groups.set(row.address, [row])
  })
  return groups
}

export const createPrismaLenderKycRepository = (
  database: PrismaClient,
): LenderKycRepository => ({
  async createStart({ address, chainId, source }) {
    const row = await database.lenderKycStart.create({
      data: { address, chainId, source },
    })
    const revision = await findVisibleRevision(database, address, chainId)
    return { start: toStart(row), hasSavedRecord: !!revision }
  },

  async getWalletStatus(address, chainId) {
    const revision = await findVisibleRevision(database, address, chainId)
    return { hasSavedRecord: !!revision }
  },

  async findStart(startId) {
    const row = await database.lenderKycStart.findUnique({
      where: { id: startId },
    })
    return row ? toStart(row) : undefined
  },

  async discardStart(startId) {
    await database.lenderKycStart.deleteMany({
      where: { id: startId, outcome: null, signatures: { none: {} } },
    })
  },

  async recordClosed(startId) {
    await database.lenderKycStart.updateMany({
      where: { id: startId, outcome: null },
      data: { outcome: "closed", outcomeAt: new Date() },
    })
  },

  async recordNotSigned(startId, reason) {
    await database.lenderKycStart.updateMany({
      where: {
        id: startId,
        OR: [{ outcome: null }, { outcome: { notIn: SUCCESS_OUTCOMES } }],
      },
      data: {
        outcome: "notSigned",
        outcomeReason: reason,
        outcomeAt: new Date(),
      },
    })
  },

  async recordForward(startId) {
    await database.lenderKycStart.updateMany({
      where: { id: startId, outcome: { in: SUCCESS_OUTCOMES } },
      data: { forwardedAt: new Date() },
    })
  },

  async recordReplayOutcome(startId, outcome) {
    await database.lenderKycStart.updateMany({
      where: {
        id: startId,
        OR: [{ outcome: null }, { outcome: { notIn: SUCCESS_OUTCOMES } }],
      },
      data: { outcome, outcomeReason: null, outcomeAt: new Date() },
    })
  },

  async issueNonce({ address, chainId, secretHash, expiresAt }) {
    return database.lenderKycNonce.create({
      data: {
        nonce: randomBytes(16).toString("hex"),
        address,
        chainId,
        secretHash,
        expiresAt,
      },
    })
  },

  async findNonce(nonce) {
    const row = await database.lenderKycNonce.findUnique({ where: { nonce } })
    return row ?? undefined
  },

  async findSignatureByNonce(nonce) {
    const row = await database.lenderKycSignature.findUnique({
      where: { nonce },
    })
    if (!row) return undefined
    return {
      messageKind: row.messageKind,
      outcome: row.outcome,
      chainId: row.chainId,
      address: row.address,
      signature: decryptLenderKycField("signature", row.id, row.signature),
      signedMessage: decryptLenderKycField(
        "signedMessage",
        row.id,
        row.signedMessage,
      ),
      createdAt: row.createdAt,
    }
  },

  async getVisibleProfile(address, chainId) {
    const revision = await findVisibleRevision(database, address, chainId)
    return revision ? toProfile(revision) : undefined
  },

  async recordSignedDetails(signed, details) {
    const normalized = normalizeLenderKycDetails(details)
    const isEmpty = isLenderKycDetailsEmpty(normalized)
    return database.$transaction(async (tx) => {
      const now = new Date()
      await burnNonce(tx, signed.nonce, now)
      const previousRevision = await findVisibleRevision(
        tx,
        signed.address,
        signed.chainId,
      )
      const previous = previousRevision
        ? toProfile(previousRevision)
        : undefined

      let outcome: LenderKycOutcome
      if (!previous) {
        outcome = isEmpty ? "skipped" : "submitted"
      } else if (areLenderKycDetailsEqual(previous.details, normalized)) {
        outcome = "unchanged"
      } else {
        outcome = "updated"
      }

      const signature = await createSignature(tx, signed, outcome, now)
      if ((!previous && !isEmpty) || outcome === "updated") {
        const id = randomUUID()
        await tx.lenderKycProfileRevision.create({
          data: {
            id,
            chainId: signed.chainId,
            address: signed.address,
            signatureId: signature.id,
            fullName: encryptLenderKycField(
              "fullName",
              id,
              normalized.fullName,
            ),
            email: encryptLenderKycField("email", id, normalized.email),
            companyName: encryptLenderKycField(
              "companyName",
              id,
              normalized.companyName,
            ),
            lenderType: normalized.lenderType || null,
            savedAt: now,
          },
        })
      }
      await setStartOutcome(tx, signed.startId, outcome, now)

      return {
        outcome,
        profile: {
          details: normalized,
          savedAt:
            outcome === "unchanged" && previous
              ? previous.savedAt
              : now.toISOString(),
        },
      }
    })
  },

  async recordOwnership(signed) {
    return database.$transaction(async (tx) => {
      const now = new Date()
      const revision = await findVisibleRevision(
        tx,
        signed.address,
        signed.chainId,
      )
      if (!revision) throw new LenderKycConflictError("noSavedProfile")
      const profile = toProfile(revision)
      await burnNonce(tx, signed.nonce, now)
      await createSignature(tx, signed, "unchanged", now)
      await setStartOutcome(tx, signed.startId, "unchanged", now)
      return profile
    })
  },

  async closeStaleStarts(clickedBefore, chainId) {
    const { count } = await database.lenderKycStart.updateMany({
      where: {
        outcome: null,
        clickedAt: { lt: clickedBefore },
        ...(chainId !== undefined && { chainId }),
      },
      data: { outcome: "closed", outcomeAt: new Date() },
    })
    return count
  },

  async listWalletRows(chainId) {
    const [starts, signatures, revisions] = await Promise.all([
      database.lenderKycStart.findMany({
        where: { chainId },
        orderBy: { clickedAt: "asc" },
      }),
      database.lenderKycSignature.findMany({
        where: { chainId },
        select: { address: true, termsVersion: true },
        orderBy: { createdAt: "desc" },
      }),
      database.lenderKycProfileRevision.findMany({
        where: { chainId },
        orderBy: { savedAt: "desc" },
      }),
    ])
    const latestTermsVersion = new Map<string, string>()
    signatures.forEach((signature) => {
      if (!latestTermsVersion.has(signature.address)) {
        latestTermsVersion.set(signature.address, signature.termsVersion)
      }
    })
    const latestRevision = new Map<string, DbLenderKycProfileRevision>()
    revisions.forEach((revision) => {
      if (!latestRevision.has(revision.address)) {
        latestRevision.set(revision.address, revision)
      }
    })

    return Array.from(groupByAddress(starts).entries())
      .map(([address, rows]) => {
        const clicks = rows.filter((start) => start.source === "click")
        const attemptsWithOutcome = rows.filter((start) => start.outcomeAt)
        const withOutcome = [...attemptsWithOutcome].sort(
          (a, b) =>
            (b.outcomeAt?.getTime() ?? 0) - (a.outcomeAt?.getTime() ?? 0),
        )
        const latestOutcome =
          withOutcome.find(
            (start) =>
              start.outcome && SUCCESS_OUTCOMES.includes(start.outcome),
          ) ?? attemptsWithOutcome[attemptsWithOutcome.length - 1]
        const forwardedAt = rows
          .map((start) => start.forwardedAt)
          .filter((value): value is Date => !!value)
          .sort((a, b) => b.getTime() - a.getTime())[0]
        const revision = latestRevision.get(address)
        const lastStart = rows[rows.length - 1]

        const row: LenderKycWalletRow = {
          address,
          chainId,
          firstClickedAt: clicks[0]?.clickedAt.toISOString(),
          lastClickedAt: clicks[clicks.length - 1]?.clickedAt.toISOString(),
          starts: rows.length,
          outcome: latestOutcome?.outcome ?? undefined,
          outcomeReason: latestOutcome?.outcomeReason ?? undefined,
          outcomeAt: latestOutcome?.outcomeAt?.toISOString(),
          termsVersion: latestTermsVersion.get(address),
          forwardedAt: forwardedAt?.toISOString(),
          ...(revision ? readRevisionDetails(revision) : {}),
        }
        return { row, lastStartedAt: lastStart.clickedAt.getTime() }
      })
      .sort((a, b) => b.lastStartedAt - a.lastStartedAt)
      .map(({ row }) => row)
  },
})
