import { useMutation } from "@tanstack/react-query"

import { LENDER_KYC_SIGNATURE_MAX_AGE_MS } from "@/config/lender-kyc"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { lenderKycMockService } from "@/lib/lenderKyc/mockService"
import {
  LenderKycDetailsResult,
  LenderKycSavedProfile,
} from "@/lib/lenderKyc/types"
import {
  buildLenderKycMessage,
  LenderKycDetails,
  LenderKycMessageKind,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"

export const useStartLenderKyc = () =>
  useMutation({
    mutationFn: ({ address, chainId }: { address: string; chainId: number }) =>
      lenderKycMockService.recordStart(address, chainId),
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
        typeof context?.nonce === "string"

      const pendingNonce = safeSigning.safeConnected
        ? safeSigning
            .getPendingForFlow("lender-kyc", input.address, input.chainId)
            .find(
              (record) =>
                record.status !== "failed" &&
                (!record.expiresAt || record.expiresAt > Date.now()) &&
                matchesAttempt(record.context),
            )?.context?.nonce
        : undefined
      const nonce =
        typeof pendingNonce === "string"
          ? pendingNonce
          : await lenderKycMockService.issueNonce(address, input.chainId)
      const timeSigned = Date.now()

      const signed = await safeSigning.signMessage({
        flow: "lender-kyc",
        address: input.address,
        chainId: input.chainId,
        timeSigned,
        expiresAt: timeSigned + LENDER_KYC_SIGNATURE_MAX_AGE_MS,
        context: { nonce, kind: input.kind, detailsKey },
        canResumePending: matchesAttempt,
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

      if (input.isStillRelevant && !input.isStillRelevant()) {
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
          message: signed.message,
          signature: signed.signature,
        }
        const response: SignLenderKycResult =
          input.kind === "details"
            ? {
                kind: "details",
                result: await lenderKycMockService.submitDetails(
                  payload,
                  input.details,
                ),
              }
            : {
                kind: "ownership",
                profile: await lenderKycMockService.confirmOwnership(payload),
              }
        safeSigning.markCompleted(signed.pendingSafeMessageId)
        return response
      } catch (error) {
        safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
        throw error
      }
    },
  })
}
