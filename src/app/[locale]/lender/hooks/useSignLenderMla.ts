import { useMutation, useQueryClient } from "@tanstack/react-query"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { LenderMlaSignatureInput } from "@/app/api/mla/lender-signature/interface"
import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mlaLender"
import { isTerminalClientError } from "@/utils/httpStatus"
import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

export const useSignLenderMLA = () => {
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const client = useQueryClient()

  const invalidateSignedMla = (chainId: number, market: string) =>
    client.invalidateQueries({
      queryKey: QueryKeys.Lender.GET_SIGNED_MLA(chainId, market),
    })

  return useMutation({
    mutationFn: async ({
      lenderAddress,
      mla,
      timeSigned,
    }: {
      lenderAddress: string
      mla: MasterLoanAgreementResponse
      timeSigned: number
    }) => {
      if (!signer) throw Error("No signer")
      if (signer.chainId !== mla.chainId) {
        throw Error("Wallet network does not match MLA chain")
      }
      const doSubmit = async () => {
        const signed = await safeSigning.signMessage({
          flow: "lender-mla",
          address: lenderAddress,
          chainId: mla.chainId,
          timeSigned,
          expiresAt: timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
          buildMessage: (effectiveTimeSigned) => {
            const values = getFieldValuesForLender(
              lenderAddress,
              effectiveTimeSigned,
            )
            return fillInMlaForLender(mla, values, mla.market).message
          },
        })
        safeSigning.markSubmitting(signed.pendingSafeMessageId)
        try {
          const response = await fetch(`/api/mla/lender-signature`, {
            method: "POST",
            body: JSON.stringify({
              chainId: mla.chainId,
              market: mla.market,
              address: lenderAddress,
              signature: signed.signature,
              timeSigned: signed.timeSigned,
            } as LenderMlaSignatureInput),
          })
          if (!response.ok) {
            if (isTerminalClientError(response.status)) {
              safeSigning.markCompleted(signed.pendingSafeMessageId)
              await invalidateSignedMla(mla.chainId, mla.market)
            }
            throw Error("Failed to set MLA")
          }
          safeSigning.markCompleted(signed.pendingSafeMessageId)
          return true
        } catch (error) {
          safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
          throw error
        }
      }
      await toastRequest(doSubmit(), {
        success: "MLA signed",
        error: "Failed to sign MLA",
        pending: safeSigning.safeConnected
          ? "Awaiting Safe confirmations — you may leave this page."
          : "Signing MLA...",
      })
    },
    onSuccess(_, variables) {
      if (variables) {
        invalidateSignedMla(variables.mla.chainId, variables.mla.market).catch(
          () => undefined,
        )
      }
    },
  })
}
