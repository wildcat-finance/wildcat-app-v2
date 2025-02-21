import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { LenderMlaSignatureInput } from "@/app/api/mla/lender-signature/interface"
import { toastRequest } from "@/components/Toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"

import { GET_SIGNED_MLA_KEY } from "./useSignMla"

export const useSignLenderMLA = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()

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
      if (!signer) return
      const values = getFieldValuesForLender(lenderAddress, timeSigned)
      const mlaData = fillInMlaForLender(mla, values, mla.market)

      const signMessage = async () => {
        if (sdk && safeConnected) {
          await sdk.eth.setSafeSettings([
            {
              offChainSigning: true,
            },
          ])

          const result = await sdk.txs.signMessage(mlaData.message)

          if ("safeTxHash" in result) {
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
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_SIGNED_MLA_KEY],
      })
    },
  })
}
