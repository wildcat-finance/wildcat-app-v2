/* eslint-disable no-console */
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Market, SupportedChainId, Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { lastSlaUpdateTime, MlaTemplate } from "@/app/api/mla/interface"
import {
  BorrowerProfile,
  BorrowerProfileInput,
} from "@/app/api/profiles/interface"
import { toastRequest } from "@/components/Toasts"
import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { NETWORKS_BY_ID } from "@/config/network"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  formatDate,
  getFieldValuesForBorrower,
} from "@/lib/mla"

import { useCalculateMarketAddress } from "./useCalculateMarketAddress"
import { getMlaFromForm } from "./usePreviewMla"
import { MarketValidationSchemaType } from "../../create-market/validation/validationSchema"

export const useBorrowerProfileTmp = (address: string | undefined) => {
  const { chainId } = useSelectedNetwork()
  const { data, ...result } = useQuery({
    queryKey: QueryKeys.Borrower.GET_BORROWER_PROFILE(
      chainId,
      address?.toLowerCase(),
    ),
    enabled: !!address && !!chainId,
    queryFn: async () => {
      if (!address) return undefined
      const response = await fetch(
        `/api/profiles/${address.toLowerCase()}?chainId=${chainId}`,
      )
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
      template: MlaTemplate | "noMLA"
      market: Market
      profile: BasicBorrowerInfo
      timeSigned: number
    }) => {
      if (!signer) return
      const values = getFieldValuesForBorrower({
        market,
        borrowerInfo: profile,
        networkData: NETWORKS_BY_ID[market.chainId],
        timeSigned,
        lastSlaUpdateTime: +lastSlaUpdateTime,
        asset: market.underlyingToken,
      })

      let message: string
      if (template === "noMLA") {
        console.log("no mla template id")
        message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
          "{{market}}",
          market.address.toLowerCase(),
        ).replace("{{timeSigned}}", formatDate(timeSigned)!)
        console.log("message", message)
      } else {
        const mlaData = fillInMlaTemplate(template, values)
        message = mlaData.message
      }

      const signMessage = async () => {
        if (sdk && safeConnected) {
          await sdk.eth.setSafeSettings([
            {
              offChainSigning: true,
            },
          ])

          const result = await sdk.txs.signMessage(message)

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
        const signatureResult = await signer.signMessage(message)
        return {
          signature: signatureResult,
          safeTxHash: undefined,
        }
      }

      const doSubmit = async () => {
        const { signature } = await signMessage()
        if (template === "noMLA") {
          console.log("submitting decline mla")
          const response = await fetch(
            `/api/mla/${market.address.toLowerCase()}/decline?chainId=${
              market.chainId
            }`,
            {
              method: "POST",
              body: JSON.stringify({
                chainId: market.chainId,
                signature,
                timeSigned,
              }),
            },
          )
          if (response.status !== 200) throw Error("Failed to submit MLA")
          return true
        }
        const response = await fetch(
          `/api/mla/${market.address.toLowerCase()}?chainId=${market.chainId}`,
          {
            method: "POST",
            body: JSON.stringify({
              chainId: market.chainId,
              mlaTemplate: template.id,
              signature,
              timeSigned,
            }),
          },
        )
        if (response.status !== 200) throw Error("Failed to submit MLA")
        return true
      }

      // const doSubmit = async () => {
      //   const { signature } = await signMessage()
      //   const response = await fetch(
      //     `/api/mla/${market.address.toLowerCase()}`,
      //     {
      //       method: "POST",
      //       body: JSON.stringify({
      //         mlaTemplate: template.id,
      //         signature,
      //         timeSigned,
      //       }),
      //     },
      //   )
      //   if (response.status !== 200) throw Error("Failed to set MLA")
      //   return true
      // }
      await toastRequest(doSubmit(), {
        success: "MLA set successfully",
        error: "Failed to set MLA",
        pending: "Setting MLA...",
      })
    },
    onSuccess(_, variables) {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.PREVIEW_MLA.FROM_MARKET(
          variables?.market.chainId ?? 0,
          variables?.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_MLA(
          variables?.market.chainId,
          variables?.market.address,
        ),
      })
    },
  })
}

export type SignMlaFromFormInputs = {
  form: UseFormReturn<MarketValidationSchemaType>
  timeSigned: number
  borrowerProfile: BorrowerProfile | undefined
  asset: Token | undefined
}

export const useSignMla = (salt: string) => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()

  const { data: marketAddress } = useCalculateMarketAddress(salt)

  return useMutation({
    mutationFn: async ({
      form,
      timeSigned,
      borrowerProfile,
      asset,
    }: SignMlaFromFormInputs) => {
      console.log("signing mla")
      const selectedMla = form.getValues("mla")
      const mlaTemplateId =
        selectedMla === "noMLA" ? undefined : Number(selectedMla)
      console.log("mlaTemplateId", mlaTemplateId)
      if (!signer || !marketAddress || !borrowerProfile || !asset) {
        console.log("missing required data")
        throw Error("Missing required data")
      }

      let message: string
      if (mlaTemplateId === undefined) {
        console.log("no mla template id")
        message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
          "{{market}}",
          marketAddress.toLowerCase(),
        ).replace("{{timeSigned}}", formatDate(timeSigned)!)
      } else {
        console.log("getting mla from form")
        const mlaData = await getMlaFromForm(
          signer,
          form,
          mlaTemplateId,
          timeSigned,
          borrowerProfile,
          asset,
          salt,
          NETWORKS_BY_ID[signer.chainId as SupportedChainId],
        )
        message = mlaData.message
        console.log("message", message)
      }

      const signMessage = async () => {
        console.log(message)
        if (sdk && safeConnected) {
          await sdk.eth.setSafeSettings([
            {
              offChainSigning: true,
            },
          ])

          const result = await sdk.txs.signMessage(message)

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
        const signatureResult = await signer.signMessage(message)
        console.log("signatureResult", signatureResult)
        return {
          signature: signatureResult,
          safeTxHash: undefined,
        }
      }

      const result = await toastRequest(signMessage(), {
        success: "MLA signed successfully",
        error: "Failed to set MLA",
        pending: "Setting MLA...",
      })
      return result
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.PREVIEW_MLA.FROM_FORM(
          chainId,
          marketAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_MLA(chainId, marketAddress),
      })
    },
  })
}
