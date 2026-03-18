import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { LenderMlaSignatureInput } from "@/app/api/mla/lender-signature/interface"
import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"

export const useSignLenderMLA = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { chainId: targetChainId } = useSelectedNetwork()
  const flow = useFlowMutation()

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
        "safe.connected": safeConnected,
        "market.address": mla.market.toLowerCase(),
        "lender.address": lenderAddress.toLowerCase(),
      })

      try {
        await withClientSpan(
          "mla.sign_lender",
          async (span) => {
            if (!signer) throw new Error("No signer")
            const values = getFieldValuesForLender(lenderAddress, timeSigned)
            const mlaData = fillInMlaForLender(mla, values, mla.market)

            span.setAttributes({
              "operation.kind": "signature",
              "market.address": mla.market.toLowerCase(),
              "lender.address": lenderAddress.toLowerCase(),
            })

            const signMessage = async () => {
              if (sdk && safeConnected) {
                await sdk.eth.setSafeSettings([
                  {
                    offChainSigning: true,
                  },
                ])

                const result = await sdk.txs.signMessage(mlaData.message)

                if ("safeTxHash" in result) {
                  span.setAttribute("safe.tx_hash", result.safeTxHash)
                  return {
                    signature: undefined,
                    safeTxHash: result.safeTxHash,
                  }
                }
                if ("signature" in result) {
                  return {
                    signature: result.signature as string,
                    safeTxHash: undefined,
                  }
                }
              }
              const signatureResult = await signer.signMessage(mlaData.message)
              return {
                signature: signatureResult,
                safeTxHash: undefined,
              }
            }

            const doSubmit = async () => {
              const { signature } = await signMessage()
              const response = await fetch(`/api/mla/lender-signature`, {
                method: "POST",
                body: JSON.stringify({
                  chainId: signer.chainId,
                  market: mla.market,
                  address: lenderAddress,
                  signature,
                  timeSigned,
                } as LenderMlaSignatureInput),
              })
              if (response.status !== 200) throw Error("Failed to set MLA")
              return true
            }

            await toastRequest(doSubmit(), {
              success: "MLA signed",
              error: "Failed to sign MLA",
              pending: "Signing MLA...",
            })
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "safe.connected": safeConnected,
            },
          },
        )
        flow.endSuccess()
      } catch (error) {
        flow.endError(error)
        throw error
      }
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_SIGNED_MLA(targetChainId),
      })
    },
  })
}
