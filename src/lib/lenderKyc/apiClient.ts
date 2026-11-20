import { LenderKycDetails } from "@/utils/lenderKycMessage"

import {
  LenderKycDetailsResult,
  LenderKycSavedProfile,
  LenderKycSignedPayload,
  LenderKycWalletRow,
  LenderKycWalletStatus,
} from "./types"

const BASE_PATH = "/api/lender-kyc"

const OPS_LIST_PATH = "/api/ops/lender-kyc"

export class LenderKycApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly signer?: string,
  ) {
    super(message)
  }
}

export const isLenderKycNonceConsumed = (error: unknown) =>
  error instanceof LenderKycApiError && error.code === "nonceConsumed"

export const isLenderKycWalletMismatch = (
  error: unknown,
): error is LenderKycApiError =>
  error instanceof LenderKycApiError && error.code === "walletMismatch"

const requestUrl = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
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
      typeof body?.signer === "string" ? body.signer : undefined,
    )
  }
  return response.json() as Promise<T>
}

const request = <T>(path: string, init?: RequestInit) =>
  requestUrl<T>(`${BASE_PATH}${path}`, init)

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) })

export const lenderKycApi = {
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

  listOpsRows(chainId: number, token: string) {
    return requestUrl<LenderKycWalletRow[]>(
      `${OPS_LIST_PATH}?chainId=${chainId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  },
}
