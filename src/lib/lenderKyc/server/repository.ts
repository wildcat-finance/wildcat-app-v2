import { randomBytes, randomUUID } from "crypto"

import { sortLenderTypes } from "@/config/lender-kyc"
import {
  areLenderKycDetailsEqual,
  isLenderKycDetailsEmpty,
  LenderKycDetails,
  LenderKycMessageKind,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"
import {
  LenderKycProfileRevision as DbLenderKycProfileRevision,
  LenderKycSignatureKind,
  Prisma,
  PrismaClient,
} from "@prisma-ops/client"

import { decryptLenderKycField, encryptLenderKycField } from "./crypto"
import {
  LenderKycDetailsResult,
  LenderKycOutcome,
  LenderKycSavedProfile,
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
  getWalletStatus(
    address: string,
    chainId: number,
  ): Promise<LenderKycWalletStatus>
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
  findProfileSavedAt(
    address: string,
    chainId: number,
    at: Date,
  ): Promise<Date | undefined>
  recordSignedDetails(
    signed: LenderKycSignedRecord,
    details: LenderKycDetails,
  ): Promise<LenderKycDetailsResult>
  recordOwnership(signed: LenderKycSignedRecord): Promise<LenderKycSavedProfile>
  listWalletRows(chainId: number): Promise<LenderKycWalletRow[]>
}

type Client = PrismaClient | Prisma.TransactionClient

const NONCE_PURGE_GRACE_MS = 60 * 60 * 1000

const toProfile = (row: DbLenderKycProfileRevision): LenderKycSavedProfile => ({
  details: {
    fullName: decryptLenderKycField("fullName", row.id, row.fullName),
    email: decryptLenderKycField("email", row.id, row.email),
    companyName: decryptLenderKycField("companyName", row.id, row.companyName),
    lenderTypes: sortLenderTypes(row.lenderTypes),
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
        lenderTypes: sortLenderTypes(row.lenderTypes),
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

const lockWallet = (
  client: Prisma.TransactionClient,
  address: string,
  chainId: number,
) =>
  client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`lender-kyc:${chainId}:${address}`}, 0))`

const nextSavedAt = (previous: Date | undefined) => {
  const now = new Date()
  return previous && previous.getTime() >= now.getTime()
    ? new Date(previous.getTime() + 1)
    : now
}

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

export const createPrismaLenderKycRepository = (
  database: PrismaClient,
): LenderKycRepository => ({
  async getWalletStatus(address, chainId) {
    const revision = await findVisibleRevision(database, address, chainId)
    return { hasSavedRecord: !!revision }
  },

  async issueNonce({ address, chainId, secretHash, expiresAt }) {
    await database.lenderKycNonce.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - NONCE_PURGE_GRACE_MS) } },
    })
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

  async findProfileSavedAt(address, chainId, at) {
    const revision = await database.lenderKycProfileRevision.findFirst({
      where: { address, chainId, savedAt: { lt: at } },
      orderBy: { savedAt: "desc" },
      select: { savedAt: true },
    })
    return revision?.savedAt
  },

  async recordSignedDetails(signed, details) {
    const normalized = normalizeLenderKycDetails(details)
    const isEmpty = isLenderKycDetailsEmpty(normalized)
    return database.$transaction(async (tx) => {
      await lockWallet(tx, signed.address, signed.chainId)
      const previousRevision = await findVisibleRevision(
        tx,
        signed.address,
        signed.chainId,
      )
      const now = nextSavedAt(previousRevision?.savedAt)
      await burnNonce(tx, signed.nonce, now)
      const previous = previousRevision
        ? toProfile(previousRevision)
        : undefined

      const isUnchanged =
        !!previous && areLenderKycDetailsEqual(previous.details, normalized)
      let outcome: LenderKycOutcome
      if (isUnchanged) {
        outcome = "unchanged"
      } else if (isEmpty) {
        outcome = "skipped"
      } else {
        outcome = previous ? "updated" : "submitted"
      }

      const signature = await createSignature(tx, signed, outcome, now)
      if (!isUnchanged && (!!previous || !isEmpty)) {
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
            lenderTypes: normalized.lenderTypes,
            savedAt: now,
          },
        })
      }

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
      return profile
    })
  },

  async listWalletRows(chainId) {
    const [signatures, revisions] = await Promise.all([
      database.lenderKycSignature.findMany({
        where: { chainId },
        select: { address: true, termsVersion: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      database.lenderKycProfileRevision.findMany({
        where: { chainId },
        orderBy: { savedAt: "desc" },
      }),
    ])
    const latestRevision = new Map<string, DbLenderKycProfileRevision>()
    revisions.forEach((revision) => {
      if (!latestRevision.has(revision.address)) {
        latestRevision.set(revision.address, revision)
      }
    })

    const rows = new Map<string, LenderKycWalletRow>()
    signatures.forEach((signature) => {
      const signedAt = signature.createdAt.toISOString()
      const row = rows.get(signature.address)
      if (row) {
        row.lastSignedAt = signedAt
        row.termsVersion = signature.termsVersion
        return
      }
      const revision = latestRevision.get(signature.address)
      rows.set(signature.address, {
        address: signature.address,
        chainId,
        firstSignedAt: signedAt,
        lastSignedAt: signedAt,
        termsVersion: signature.termsVersion,
        ...(revision ? readRevisionDetails(revision) : {}),
      })
    })

    return Array.from(rows.values()).sort((a, b) =>
      b.lastSignedAt.localeCompare(a.lastSignedAt),
    )
  },
})
