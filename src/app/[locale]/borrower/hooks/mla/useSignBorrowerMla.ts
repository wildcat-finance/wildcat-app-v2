import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useRouter } from "next/navigation"

import { lastSlaUpdateTime, MlaTemplate } from "@/app/api/mla/interface"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { toastRequest } from "@/components/Toasts"
import { TargetNetwork } from "@/config/network"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_MARKET_MLA_KEY } from "@/hooks/useMarketMla"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
} from "@/lib/mla"

import { PREVIEW_MLA_KEY } from "./usePreviewMla"

const GET_BORROWER_PROFILE_KEY = "GET_BORROWER_PROFILE"

export const useBorrowerProfileTmp = (address: string | undefined) => {
  const { data, ...result } = useQuery({
    queryKey: [GET_BORROWER_PROFILE_KEY, address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return undefined
      const response = await fetch(`/api/profiles/${address.toLowerCase()}`)
      if (response.status === 404) return null

      return response
        .json()
        .then((res) => res?.profile) as Promise<BorrowerProfileInput>
    },
  })

  return { data, ...result }
}

export const useSetMarketMLA = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      template,
      market,
      profile,
      timeSigned,
    }: {
      template: MlaTemplate
      market: Market
      profile: BasicBorrowerInfo
      timeSigned: number
    }) => {
      if (!signer) return
      const values = getFieldValuesForBorrower(
        market,
        profile,
        TargetNetwork,
        timeSigned,
        +lastSlaUpdateTime,
      )
      const mlaData = fillInMlaTemplate(template, values)

      const signMessage = async () => {
        if (sdk && safeConnected) {
          await sdk.eth.setSafeSettings([
            {
              offChainSigning: true,
            },
          ])

          const result = await sdk.txs.signMessage(mlaData.plaintext)

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
        const signatureResult = await signer.signMessage(mlaData.plaintext)
        return {
          signature: signatureResult,
          safeTxHash: undefined,
        }
      }

      const doSubmit = async () => {
        const { signature } = await signMessage()
        const response = await fetch(
          `/api/mla/${market.address.toLowerCase()}`,
          {
            method: "POST",
            body: JSON.stringify({
              mlaTemplate: template.id,
              signature,
              timeSigned,
            }),
          },
        )
        if (response.status !== 200) throw Error("Failed to set MLA")
        return true
      }
      await toastRequest(doSubmit(), {
        success: "MLA set successfully",
        error: "Failed to set MLA",
        pending: "Setting MLA...",
      })
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [PREVIEW_MLA_KEY],
      })
      client.invalidateQueries({
        queryKey: [GET_MARKET_MLA_KEY],
      })
    },
  })
}
