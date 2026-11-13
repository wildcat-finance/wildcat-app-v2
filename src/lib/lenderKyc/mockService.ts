import {
  LENDER_KYC_SIGNATURE_MAX_AGE_MS,
  LENDER_KYC_TERMS_VERSION,
} from "@/config/lender-kyc"
import {
  areLenderKycDetailsEqual,
  isLenderKycDetailsEmpty,
  LenderKycDetails,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"

import {
  LenderKycDetailsResult,
  LenderKycNotSignedReason,
  LenderKycOutcome,
  LenderKycSavedProfile,
  LenderKycSignedPayload,
  LenderKycStart,
  LenderKycStartResult,
  LenderKycStore,
  LenderKycWalletRow,
} from "./types"

const STORAGE_KEY = "wildcat:lender-kyc-mock:v1"
const LATENCY_MS = 350

const emptyStore = (): LenderKycStore => ({
  starts: [],
  signatures: [],
  revisions: [],
  nonces: [],
})

let memoryStore: LenderKycStore = emptyStore()
let isStorageAvailable = true

const readStore = (): LenderKycStore => {
  if (!isStorageAvailable) return memoryStore
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<LenderKycStore>
    return { ...emptyStore(), ...parsed }
  } catch {
    isStorageAvailable = false
    return memoryStore
  }
}

const writeStore = (store: LenderKycStore) => {
  memoryStore = store
  if (!isStorageAvailable) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    isStorageAvailable = false
  }
}

const delay = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, LATENCY_MS)
  })

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const nowIso = () => new Date().toISOString()

const SUCCESS_OUTCOMES: LenderKycOutcome[] = [
  "submitted",
  "updated",
  "unchanged",
  "skipped",
]

const latestRevision = (store: LenderKycStore, address: string) =>
  store.revisions
    .filter((revision) => revision.address === address)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0]

const findStart = (store: LenderKycStore, startId: string) => {
  const start = store.starts.find((item) => item.id === startId)
  if (!start) throw new Error("Unknown KYC start")
  return start
}

const setOutcome = (
  start: LenderKycStart,
  outcome: LenderKycOutcome,
  reason?: LenderKycNotSignedReason,
) => {
  start.outcome = outcome
  start.outcomeReason = reason
  start.outcomeAt = nowIso()
}

const consumeNonce = (
  store: LenderKycStore,
  payload: LenderKycSignedPayload,
) => {
  const record = store.nonces.find((item) => item.nonce === payload.nonce)
  if (
    !record ||
    record.usedAt ||
    record.address !== payload.address ||
    record.chainId !== payload.chainId ||
    Date.parse(record.expiresAt) < Date.now()
  ) {
    throw new Error("Invalid or expired nonce")
  }
  if (!payload.message.includes(payload.address)) {
    throw new Error("Signed message does not match the connected wallet")
  }
  record.usedAt = nowIso()
}

const storeSignature = (
  store: LenderKycStore,
  payload: LenderKycSignedPayload,
  kind: "details" | "ownership",
) => {
  const id = createId()
  store.signatures.push({
    id,
    startId: payload.startId,
    kind,
    address: payload.address,
    chainId: payload.chainId,
    nonce: payload.nonce,
    message: payload.message,
    signature: payload.signature,
    termsVersion: LENDER_KYC_TERMS_VERSION,
    signedAt: nowIso(),
  })
  return id
}

export const lenderKycMockService = {
  async recordStart(
    address: string,
    chainId: number,
  ): Promise<LenderKycStartResult> {
    await delay()
    const store = readStore()
    const normalizedAddress = address.toLowerCase()
    const start: LenderKycStart = {
      id: createId(),
      address: normalizedAddress,
      chainId,
      clickedAt: nowIso(),
    }
    store.starts.push(start)
    writeStore(store)
    return {
      start,
      hasSavedRecord: !!latestRevision(store, normalizedAddress),
    }
  },

  async discardStart(startId: string) {
    const store = readStore()
    store.starts = store.starts.filter((start) => start.id !== startId)
    writeStore(store)
  },

  async issueNonce(address: string, chainId: number): Promise<string> {
    const store = readStore()
    const nonce = createId().replace(/-/g, "").slice(0, 16)
    const issuedAt = Date.now()
    store.nonces.push({
      nonce,
      address: address.toLowerCase(),
      chainId,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(
        issuedAt + LENDER_KYC_SIGNATURE_MAX_AGE_MS,
      ).toISOString(),
    })
    writeStore(store)
    return nonce
  },

  async submitDetails(
    payload: LenderKycSignedPayload,
    details: LenderKycDetails,
  ): Promise<LenderKycDetailsResult> {
    await delay()
    const store = readStore()
    consumeNonce(store, payload)
    const start = findStart(store, payload.startId)
    const signatureId = storeSignature(store, payload, "details")
    const previous = latestRevision(store, payload.address)
    const normalized = normalizeLenderKycDetails(details)

    const isEmpty = isLenderKycDetailsEmpty(normalized)
    let outcome: LenderKycOutcome
    if (!previous) {
      outcome = isEmpty ? "skipped" : "submitted"
    } else if (areLenderKycDetailsEqual(previous.details, normalized)) {
      outcome = "unchanged"
    } else {
      outcome = "updated"
    }

    const savedAt = nowIso()
    if ((!previous && !isEmpty) || outcome === "updated") {
      store.revisions.push({
        id: createId(),
        address: payload.address,
        signatureId,
        details: normalized,
        savedAt,
      })
    }
    setOutcome(start, outcome)
    writeStore(store)
    return {
      outcome,
      profile: {
        details: normalized,
        savedAt:
          outcome === "unchanged" && previous ? previous.savedAt : savedAt,
      },
    }
  },

  async confirmOwnership(
    payload: LenderKycSignedPayload,
  ): Promise<LenderKycSavedProfile> {
    await delay()
    const store = readStore()
    consumeNonce(store, payload)
    const start = findStart(store, payload.startId)
    const revision = latestRevision(store, payload.address)
    if (!revision) throw new Error("No saved record for this wallet")
    storeSignature(store, payload, "ownership")
    setOutcome(start, "unchanged")
    writeStore(store)
    return { details: revision.details, savedAt: revision.savedAt }
  },

  async recordNotSigned(startId: string, reason: LenderKycNotSignedReason) {
    const store = readStore()
    const start = findStart(store, startId)
    if (start.outcome && SUCCESS_OUTCOMES.includes(start.outcome)) return
    setOutcome(start, "notSigned", reason)
    writeStore(store)
  },

  async recordClosed(startId: string) {
    const store = readStore()
    const start = store.starts.find((item) => item.id === startId)
    if (!start || start.outcome) return
    setOutcome(start, "closed")
    writeStore(store)
  },

  async recordForward(startId: string) {
    const store = readStore()
    const start = findStart(store, startId)
    start.forwardedAt = nowIso()
    writeStore(store)
  },

  async listWalletRows(): Promise<LenderKycWalletRow[]> {
    await delay()
    const store = readStore()
    const byAddress = new Map<string, LenderKycStart[]>()
    store.starts.forEach((start) => {
      byAddress.set(start.address, [
        ...(byAddress.get(start.address) ?? []),
        start,
      ])
    })

    return Array.from(byAddress.entries())
      .map(([address, starts]) => {
        const sorted = [...starts].sort((a, b) =>
          a.clickedAt.localeCompare(b.clickedAt),
        )
        const withOutcome = sorted
          .filter((start) => start.outcomeAt)
          .sort((a, b) => (b.outcomeAt ?? "").localeCompare(a.outcomeAt ?? ""))
        const latestOutcome = withOutcome[0]
        const latestSignature = store.signatures
          .filter((signature) => signature.address === address)
          .sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0]
        const forwarded = sorted
          .map((start) => start.forwardedAt)
          .filter((value): value is string => !!value)
          .sort()
          .pop()
        const revision = latestRevision(store, address)

        return {
          address,
          chainId: sorted[sorted.length - 1].chainId,
          firstClickedAt: sorted[0].clickedAt,
          lastClickedAt: sorted[sorted.length - 1].clickedAt,
          starts: sorted.length,
          outcome: latestOutcome?.outcome,
          outcomeReason: latestOutcome?.outcomeReason,
          outcomeAt: latestOutcome?.outcomeAt,
          termsVersion: latestSignature?.termsVersion,
          forwardedAt: forwarded,
          details: revision?.details,
        }
      })
      .sort((a, b) => b.lastClickedAt.localeCompare(a.lastClickedAt))
  },
}

export const LENDER_KYC_SAMPLE_ROWS: LenderKycWalletRow[] = [
  {
    address: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b9fe0",
    chainId: 1,
    firstClickedAt: "2026-11-12T09:41:00.000Z",
    lastClickedAt: "2026-11-20T14:03:00.000Z",
    starts: 3,
    outcome: "updated",
    outcomeAt: "2026-11-20T14:05:00.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
    forwardedAt: "2026-11-20T14:06:00.000Z",
    details: {
      fullName: "Jane Doe",
      email: "jane@newcompany.com",
      companyName: "Company Ltd",
      lenderType: "institutional",
    },
  },
  {
    address: "0x7c4d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b11ab",
    chainId: 1,
    firstClickedAt: "2026-11-15T16:10:00.000Z",
    lastClickedAt: "2026-11-15T16:10:00.000Z",
    starts: 1,
    outcome: "submitted",
    outcomeAt: "2026-11-15T16:11:00.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
    forwardedAt: "2026-11-15T16:12:00.000Z",
    details: {
      fullName: "Jane Doe",
      email: "jane@newcompany.com",
      companyName: "Company Ltd",
      lenderType: "institutional",
    },
  },
  {
    address: "0x3e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5da02c",
    chainId: 1,
    firstClickedAt: "2026-11-16T08:03:00.000Z",
    lastClickedAt: "2026-11-16T08:03:00.000Z",
    starts: 1,
    outcome: "skipped",
    outcomeAt: "2026-11-16T08:03:30.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
    forwardedAt: "2026-11-16T08:04:00.000Z",
  },
  {
    address: "0x9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a4d7e",
    chainId: 1,
    firstClickedAt: "2026-11-17T11:20:00.000Z",
    lastClickedAt: "2026-11-17T11:20:00.000Z",
    starts: 1,
    outcome: "closed",
    outcomeAt: "2026-11-17T11:21:00.000Z",
  },
  {
    address: "0x2f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e7c3d",
    chainId: 1,
    firstClickedAt: "2026-11-18T10:02:00.000Z",
    lastClickedAt: "2026-11-18T10:02:00.000Z",
    starts: 1,
    outcome: "notSigned",
    outcomeReason: "walletMismatch",
    outcomeAt: "2026-11-18T10:03:00.000Z",
  },
]
