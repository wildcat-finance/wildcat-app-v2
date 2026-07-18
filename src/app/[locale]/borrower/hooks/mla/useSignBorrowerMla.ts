/* eslint-disable no-console */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Market, SupportedChainId, Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"
import { useAccount } from "wagmi"

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
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  formatDate,
  getFieldValuesForBorrower,
} from "@/lib/mla"
import { isTerminalClientError } from "@/utils/httpStatus"

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
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const client = useQueryClient()

  const invalidateMlaState = (chainId: number, marketAddress: string) =>
    Promise.all([
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.PREVIEW_MLA.FROM_MARKET(
          chainId,
          marketAddress,
        ),
      }),
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_MLA(chainId, marketAddress),
      }),
    ])

  const mutation = useMutation({
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
      if (signer.chainId !== market.chainId) {
        throw Error("Wallet network does not match market chain")
      }
      const signMessage = () =>
        safeSigning.signMessage({
          flow: template === "noMLA" ? "borrower-mla-decline" : "borrower-mla",
          address: market.borrower,
          chainId: market.chainId,
          timeSigned,
          buildMessage: (effectiveTimeSigned) => {
            if (template === "noMLA") {
              return DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
                "{{market}}",
                market.address.toLowerCase(),
              ).replace("{{timeSigned}}", formatDate(effectiveTimeSigned)!)
            }
            const values = getFieldValuesForBorrower({
              market,
              borrowerInfo: profile,
              networkData: NETWORKS_BY_ID[market.chainId],
              timeSigned: effectiveTimeSigned,
              lastSlaUpdateTime: +lastSlaUpdateTime,
              asset: market.underlyingToken,
            })
            return fillInMlaTemplate(template, values).message
          },
        })

      const doSubmit = async () => {
        const signed = await signMessage()
        safeSigning.markSubmitting(signed.pendingSafeMessageId)
        try {
          if (template === "noMLA") {
            const response = await fetch(
              `/api/mla/${market.address.toLowerCase()}/decline?chainId=${
                market.chainId
              }`,
              {
                method: "POST",
                body: JSON.stringify({
                  chainId: market.chainId,
                  signature: signed.signature,
                  timeSigned: signed.timeSigned,
                }),
              },
            )
            if (!response.ok) {
              if (isTerminalClientError(response.status)) {
                safeSigning.markCompleted(signed.pendingSafeMessageId)
                await invalidateMlaState(market.chainId, market.address)
              }
              throw Error("Failed to submit MLA")
            }
          } else {
            const response = await fetch(
              `/api/mla/${market.address.toLowerCase()}?chainId=${
                market.chainId
              }`,
              {
                method: "POST",
                body: JSON.stringify({
                  chainId: market.chainId,
                  mlaTemplate: template.id,
                  signature: signed.signature,
                  timeSigned: signed.timeSigned,
                }),
              },
            )
            if (!response.ok) {
              if (isTerminalClientError(response.status)) {
                safeSigning.markCompleted(signed.pendingSafeMessageId)
                await invalidateMlaState(market.chainId, market.address)
              }
              throw Error("Failed to submit MLA")
            }
          }
          safeSigning.markCompleted(signed.pendingSafeMessageId)
          return true
        } catch (error) {
          safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
          throw error
        }
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
      if (variables) {
        invalidateMlaState(
          variables.market.chainId,
          variables.market.address,
        ).catch(() => undefined)
      }
    },
  })

  return mutation
}

export type SignMlaFromFormInputs = {
  form: UseFormReturn<MarketValidationSchemaType>
  timeSigned: number
  borrowerProfile: BorrowerProfile | undefined
  asset: Token | undefined
}

export const useSignMla = (salt: string) => {
  const { address } = useAccount()
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()

  const { data: marketAddress } = useCalculateMarketAddress(salt)

  const mutation = useMutation({
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
      if (!signer || !address || !marketAddress || !borrowerProfile || !asset) {
        console.log("missing required data")
        throw Error("Missing required data")
      }
      if (signer.chainId !== chainId) {
        throw Error("Wallet network does not match selected network")
      }

      const result = await toastRequest(
        safeSigning.signMessage({
          flow: "borrower-market-mla",
          address,
          chainId,
          timeSigned,
          buildMessage: async (effectiveTimeSigned) => {
            if (mlaTemplateId === undefined) {
              return DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
                "{{market}}",
                marketAddress.toLowerCase(),
              ).replace("{{timeSigned}}", formatDate(effectiveTimeSigned)!)
            }
            const mlaData = await getMlaFromForm(
              signer,
              form,
              mlaTemplateId,
              effectiveTimeSigned,
              borrowerProfile,
              asset,
              salt,
              NETWORKS_BY_ID[chainId as SupportedChainId],
            )
            return mlaData.message
          },
        }),
        {
          success: "MLA signed successfully",
          error: "Failed to set MLA",
          pending: safeSigning.safeConnected
            ? "Awaiting Safe confirmations — you may leave this page."
            : "Setting MLA...",
        },
      )
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

  return {
    ...mutation,
    completeSafeMessage: safeSigning.markCompleted,
  }
}
