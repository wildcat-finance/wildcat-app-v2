import { useCallback } from "react"

import { useMutation } from "@tanstack/react-query"

import {
  isLenderType,
  LENDER_KYC_SIGNATURE_MAX_AGE_MS,
} from "@/config/lender-kyc"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import {
  isLenderKycNonceConsumed,
  lenderKycApi,
} from "@/lib/lenderKyc/apiClient"
import {
  LenderKycDetailsResult,
  LenderKycSavedProfile,
  LenderKycStartSource,
} from "@/lib/lenderKyc/types"
import {
  buildLenderKycMessage,
  LenderKycDetails,
  LenderKycMessageKind,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"

const parsePendingDetails = (
  context?: Record<string, string | number | boolean>,
): LenderKycDetails | undefined => {
  if (
    context?.kind !== "details" ||
    typeof context.detailsKey !== "string" ||
    typeof context.nonce !== "string" ||
    typeof context.secret !== "string"
  ) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(context.detailsKey)
    if (!parsed || typeof parsed !== "object") return undefined
    const { fullName, email, companyName, lenderTypes } = parsed as Record<
      string,
      unknown
    >
    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof companyName !== "string" ||
      !Array.isArray(lenderTypes) ||
      !lenderTypes.every(isLenderType)
    ) {
      return undefined
    }
    return normalizeLenderKycDetails({
      fullName,
      email,
      companyName,
      lenderTypes,
    })
  } catch {
    return undefined
  }
}

export const usePendingSafeLenderKycDetails = () => {
  const { safeConnected, getPendingForFlow } = useSafeMessageSigning()

  return useCallback(
    (address: string, chainId: number): LenderKycDetails | undefined => {
      if (!safeConnected) return undefined
      return getPendingForFlow("lender-kyc", address, chainId)
        .filter(
          (record) =>
            record.status !== "failed" &&
            (!record.expiresAt || record.expiresAt > Date.now()),
        )
        .flatMap((record) => {
          const details = parsePendingDetails(record.context)
          if (!details) return []
          const rebuilt = buildLenderKycMessage({
            kind: "details",
            address: address.toLowerCase(),
            chainId,
            nonce: String(record.context?.nonce),
            timeSigned: record.timeSigned,
            details,
          })
          return rebuilt === record.message ? [details] : []
        })[0]
    },
    [safeConnected, getPendingForFlow],
  )
}

export const useStartLenderKyc = () =>
  useMutation({
    mutationFn: ({
      address,
      chainId,
      source,
    }: {
      address: string
      chainId: number
      source?: LenderKycStartSource
    }) => lenderKycApi.recordStart(address, chainId, source),
  })

type SignLenderKycInput = {
  startId: string
  address: string
  chainId: number
  isStillRelevant?: () => boolean
} & (
  | {
      kind: Extract<LenderKycMessageKind, "details">
      details: LenderKycDetails
    }
  | { kind: Extract<LenderKycMessageKind, "ownership"> }
)

export type SignLenderKycResult =
  | { kind: "details"; result: LenderKycDetailsResult }
  | { kind: "ownership"; profile: LenderKycSavedProfile }

export const useSignLenderKyc = () => {
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()

  return useMutation({
    mutationFn: async (
      input: SignLenderKycInput,
    ): Promise<SignLenderKycResult> => {
      if (!signer) throw Error("No signer")
      if (signer.chainId !== input.chainId) {
        throw Error("Wallet network does not match signing network")
      }

      const address = input.address.toLowerCase()
      const details = input.kind === "details" ? input.details : undefined
      const detailsKey = details
        ? JSON.stringify(normalizeLenderKycDetails(details))
        : ""
      const matchesAttempt = (
        context?: Record<string, string | number | boolean>,
      ) =>
        context?.kind === input.kind &&
        context?.detailsKey === detailsKey &&
        typeof context?.nonce === "string" &&
        typeof context?.secret === "string"

      const isStillRelevant = () =>
        !input.isStillRelevant || input.isStillRelevant()

      const attempt = async (
        allowResume: boolean,
      ): Promise<SignLenderKycResult> => {
        const pendingRecord =
          allowResume && safeSigning.safeConnected
            ? safeSigning
                .getPendingForFlow("lender-kyc", input.address, input.chainId)
                .find(
                  (record) =>
                    record.status !== "failed" &&
                    (!record.expiresAt || record.expiresAt > Date.now()) &&
                    matchesAttempt(record.context),
                )
            : undefined
        const pendingContext = pendingRecord?.context
        const { nonce, secret } = pendingContext
          ? {
              nonce: String(pendingContext.nonce),
              secret: String(pendingContext.secret),
            }
          : await lenderKycApi.issueNonce(address, input.chainId)
        const timeSigned = Date.now()

        const signed = await safeSigning.signMessage({
          flow: "lender-kyc",
          address: input.address,
          chainId: input.chainId,
          timeSigned,
          expiresAt: timeSigned + LENDER_KYC_SIGNATURE_MAX_AGE_MS,
          context: { nonce, secret, kind: input.kind, detailsKey },
          canResumePending: allowResume ? matchesAttempt : () => false,
          isStillRelevant: input.isStillRelevant,
          buildMessage: (time, context) =>
            buildLenderKycMessage({
              kind: input.kind,
              address,
              chainId: input.chainId,
              nonce: String(context?.nonce ?? nonce),
              timeSigned: time,
              details,
            }),
        })
        const signedNonce = String(signed.context?.nonce ?? nonce)
        const signedSecret = String(signed.context?.secret ?? secret)

        if (!isStillRelevant()) {
          throw Error("Signing request was discarded")
        }

        if (!safeSigning.safeConnected && signed.signature === "0x") {
          throw Error("Wallet returned an empty signature")
        }

        safeSigning.markSubmitting(signed.pendingSafeMessageId)
        try {
          const payload = {
            startId: input.startId,
            address,
            chainId: input.chainId,
            nonce: signedNonce,
            secret: signedSecret,
            timeSigned: signed.timeSigned,
            signature: signed.signature,
          }
          const response: SignLenderKycResult =
            input.kind === "details"
              ? {
                  kind: "details",
                  result: await lenderKycApi.submitDetails(
                    payload,
                    input.details,
                  ),
                }
              : {
                  kind: "ownership",
                  profile: await lenderKycApi.confirmOwnership(payload),
                }
          safeSigning.markCompleted(signed.pendingSafeMessageId)
          return response
        } catch (error) {
          if (!isLenderKycNonceConsumed(error)) {
            safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
            throw error
          }
          safeSigning.markCompleted(signed.pendingSafeMessageId)
          if (!pendingRecord) throw error
          if (pendingRecord.id !== signed.pendingSafeMessageId) {
            safeSigning.markCompleted(pendingRecord.id)
          }
          if (isStillRelevant()) return attempt(false)
          throw error
        }
      }

      return attempt(true)
    },
  })
}
