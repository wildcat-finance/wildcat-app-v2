import { context } from "@opentelemetry/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { LenderMlaSignatureInput } from "@/app/api/mla/lender-signature/interface"
import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
import { isTerminalClientError } from "@/utils/httpStatus"
import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

export const useSignLenderMLA = () => {
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const client = useQueryClient()
  const flow = useFlowMutation()

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
      flow.start("mla.sign_lender.flow", {
        "safe.connected": safeSigning.safeConnected,
        "market.address": mla.market.toLowerCase(),
        "lender.address": lenderAddress.toLowerCase(),
      })

      if (!signer) {
        flow.endCancel({
          "safe.connected": safeSigning.safeConnected,
          "market.address": mla.market.toLowerCase(),
          "lender.address": lenderAddress.toLowerCase(),
          "flow.cancelled": true,
        })
        return
      }

      try {
        if (signer.chainId !== mla.chainId) {
          throw Error("Wallet network does not match MLA chain")
        }

        await withClientSpan(
          "mla.sign_lender",
          async (span) => {
            span.setAttributes({
              "operation.kind": "signature",
              "market.address": mla.market.toLowerCase(),
              "lender.address": lenderAddress.toLowerCase(),
            })

            const doSubmit = async () => {
              const signed = await safeSigning.signMessage({
                flow: "lender-mla",
                address: lenderAddress,
                chainId: mla.chainId,
                timeSigned,
                // Expire the pending Safe record when the server would start
                // rejecting its embedded timeSigned (the MLA endpoints share the
                // ToU signing window).
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
                safeSigning.markSubmissionFailed(
                  signed.pendingSafeMessageId,
                  error,
                )
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
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "safe.connected": safeSigning.safeConnected,
            },
          },
        )
        flow.endSuccess()
      } catch (error) {
        flow.endError(error)
        throw error
      }
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
