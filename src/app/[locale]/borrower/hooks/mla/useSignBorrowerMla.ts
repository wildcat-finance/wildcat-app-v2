/* eslint-disable no-console */
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DeployableMarketKind,
  Market,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"
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
import { useAppStore } from "@/store/hooks"
import { getCreateMarketSigningDraftScope } from "@/store/slices/createMarketSigningDraftsSlice/createMarketSigningDraftsSlice"
import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

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
  draftId?: string
  resumeMessage?: string
}

export const useSignMla = (salt: string, marketKind: DeployableMarketKind) => {
  const { address } = useAccount()
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const store = useAppStore()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()

  const { data: marketAddress } = useCalculateMarketAddress(salt, marketKind)

  const mutation = useMutation({
    mutationFn: async ({
      form,
      timeSigned,
      borrowerProfile,
      asset,
      draftId,
      resumeMessage,
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
          expiresAt: timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
          context: draftId ? { draftId, draftVersion: 2 } : undefined,
          isStillRelevant: draftId
            ? () =>
                store.getState().createMarketSigningDrafts.records[
                  getCreateMarketSigningDraftScope(address, chainId)
                ]?.id === draftId
            : undefined,
          canResumePending: draftId
            ? (context) =>
                context?.draftId === draftId && context.draftVersion === 2
            : undefined,
          buildMessage: async (effectiveTimeSigned, context) => {
            if (
              resumeMessage &&
              draftId &&
              effectiveTimeSigned === timeSigned &&
              context?.draftId === draftId &&
              context.draftVersion === 2
            ) {
              return resumeMessage
            }
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
              marketKind,
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
    marketAddress,
    isSafeSigning: safeSigning.safeConnected,
    completeSafeMessage: safeSigning.markCompleted,
  }
}
