import { LenderKycDetails } from "@/utils/lenderKycMessage"

import {
  LenderKycDetailsResult,
  LenderKycNotSignedReason,
  LenderKycSavedProfile,
  LenderKycSignedPayload,
  LenderKycStartResult,
  LenderKycStartSource,
  LenderKycWalletRow,
  LenderKycWalletStatus,
} from "./types"

const BASE_PATH = "/api/lender-kyc"

export class LenderKycApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

export const isLenderKycNonceConsumed = (error: unknown) =>
  error instanceof LenderKycApiError && error.code === "nonceConsumed"

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new LenderKycApiError(
      typeof body?.error === "string"
        ? body.error
        : "Lender KYC request failed",
      response.status,
      typeof body?.code === "string" ? body.code : undefined,
    )
  }
  return response.json() as Promise<T>
}

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) })

type StartAction =
  | { action: "closed" }
  | { action: "discard" }
  | { action: "forward" }
  | { action: "notSigned"; reason: LenderKycNotSignedReason }

const sendStartAction = (startId: string, action: StartAction) =>
  postJson<{ success: true }>(`/starts/${startId}`, action).then(
    () => undefined,
    () => undefined,
  )

export const lenderKycApi = {
  recordStart(
    address: string,
    chainId: number,
    source: LenderKycStartSource = "click",
  ) {
    return postJson<LenderKycStartResult>("/starts", {
      address,
      chainId,
      source,
    })
  },

  getWalletStatus(address: string, chainId: number) {
    const params = new URLSearchParams({
      address,
      chainId: String(chainId),
    })
    return request<LenderKycWalletStatus>(`/status?${params}`)
  },

  issueNonce(address: string, chainId: number) {
    return postJson<{ nonce: string; secret: string; expiresAt: string }>(
      "/nonce",
      { address, chainId },
    )
  },

  submitDetails(payload: LenderKycSignedPayload, details: LenderKycDetails) {
    return postJson<LenderKycDetailsResult>("/details", {
      ...payload,
      details,
    })
  },

  confirmOwnership(payload: LenderKycSignedPayload) {
    return postJson<LenderKycSavedProfile>("/ownership", payload)
  },

  discardStart(startId: string) {
    return sendStartAction(startId, { action: "discard" })
  },

  recordClosed(startId: string) {
    return sendStartAction(startId, { action: "closed" })
  },

  recordClosedOnPageHide(startId: string) {
    const body = new Blob([JSON.stringify({ action: "closed" })], {
      type: "application/json",
    })
    if (
      typeof navigator !== "undefined" &&
      navigator.sendBeacon?.(`${BASE_PATH}/starts/${startId}`, body)
    ) {
      return
    }
    fetch(`${BASE_PATH}/starts/${startId}`, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined)
  },

  recordNotSigned(startId: string, reason: LenderKycNotSignedReason) {
    return sendStartAction(startId, { action: "notSigned", reason })
  },

  recordForward(startId: string) {
    return sendStartAction(startId, { action: "forward" })
  },

  listWalletRows(chainId: number, token: string) {
    return request<LenderKycWalletRow[]>(`/admin/starts?chainId=${chainId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
