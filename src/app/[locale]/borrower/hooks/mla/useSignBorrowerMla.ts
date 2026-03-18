import { context } from "@opentelemetry/api"
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
import { logger } from "@/lib/logging/client"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  formatDate,
  getFieldValuesForBorrower,
} from "@/lib/mla"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"

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
  const flow = useFlowMutation()

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
      flow.start("mla.set_market.flow", {
        "safe.connected": safeConnected,
        "market.address": market.address.toLowerCase(),
      })

      if (!signer) {
        flow.endCancel({
          "safe.connected": safeConnected,
          "market.address": market.address.toLowerCase(),
          "flow.cancelled": true,
        })
        return
      }

      try {
        await withClientSpan(
          "mla.set_market",
          async (span) => {
            const values = getFieldValuesForBorrower({
              market,
              borrowerInfo: profile,
              networkData: NETWORKS_BY_ID[market.chainId],
              timeSigned,
              lastSlaUpdateTime: +lastSlaUpdateTime,
              asset: market.underlyingToken,
            })

            span.setAttributes({
              "operation.kind": "signature",
              "market.address": market.address.toLowerCase(),
            })

            let message: string
            if (template === "noMLA") {
              logger.info(
                { market: market.address },
                "No MLA template selected",
              )
              message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
                "{{market}}",
                market.address.toLowerCase(),
              ).replace("{{timeSigned}}", formatDate(timeSigned)!)
              logger.debug(
                { messageLength: message.length },
                "Decline MLA message prepared",
              )
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
              const signatureResult = await signer.signMessage(message)
              return {
                signature: signatureResult,
                safeTxHash: undefined,
              }
            }

            const doSubmit = async () => {
              const { signature } = await signMessage()
              if (template === "noMLA") {
                logger.info(
                  { market: market.address },
                  "Submitting decline MLA",
                )
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
                `/api/mla/${market.address.toLowerCase()}?chainId=${
                  market.chainId
                }`,
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

            await toastRequest(doSubmit(), {
              success: "MLA set successfully",
              error: "Failed to set MLA",
              pending: "Setting MLA...",
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
        flow.endError(error, {
          "market.address": market.address.toLowerCase(),
        })
        throw error
      }
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

export const useSignMla = (
  salt: string,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
  const flow = useFlowMutation()

  const { data: marketAddress } = useCalculateMarketAddress(salt)

  return useMutation({
    mutationFn: async ({
      form,
      timeSigned,
      borrowerProfile,
      asset,
    }: SignMlaFromFormInputs) => {
      const externalParentContext = getParentContext?.()
      const useExternalFlow = Boolean(externalParentContext)

      if (!useExternalFlow) {
        flow.start("mla.sign_borrower.flow", {
          "safe.connected": safeConnected,
          "market.address": marketAddress?.toLowerCase() ?? "",
        })
      }

      try {
        const result = await withClientSpan(
          "mla.sign_borrower",
          async (span) => {
            logger.info({ salt }, "Signing MLA")
            const selectedMla = form.getValues("mla")
            const mlaTemplateId =
              selectedMla === "noMLA" ? undefined : Number(selectedMla)
            logger.debug({ mlaTemplateId }, "MLA template id")
            if (!signer || !marketAddress || !borrowerProfile || !asset) {
              logger.warn(
                {
                  hasSigner: !!signer,
                  hasMarketAddress: !!marketAddress,
                  hasBorrowerProfile: !!borrowerProfile,
                  hasAsset: !!asset,
                },
                "Missing required data",
              )
              throw Error("Missing required data")
            }

            span.setAttributes({
              "operation.kind": "signature",
              "market.address": marketAddress.toLowerCase(),
            })

            let message: string
            if (mlaTemplateId === undefined) {
              logger.info({ marketAddress }, "No MLA template selected")
              message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
                "{{market}}",
                marketAddress.toLowerCase(),
              ).replace("{{timeSigned}}", formatDate(timeSigned)!)
            } else {
              logger.debug({ mlaTemplateId }, "Getting MLA from form")
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
              logger.debug(
                { messageLength: message.length },
                "MLA message prepared",
              )
            }

            const signMessage = async () => {
              logger.debug("Signing message")
              if (sdk && safeConnected) {
                await sdk.eth.setSafeSettings([
                  {
                    offChainSigning: true,
                  },
                ])

                const signResult = await sdk.txs.signMessage(message)

                if ("safeTxHash" in signResult) {
                  span.setAttribute("safe.tx_hash", signResult.safeTxHash)
                  return {
                    signature: undefined,
                    safeTxHash: signResult.safeTxHash,
                  }
                }
                if ("signature" in signResult) {
                  return {
                    signature: signResult.signature as string,
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

            return toastRequest(signMessage(), {
              success: "MLA signed successfully",
              error: "Failed to set MLA",
              pending: "Setting MLA...",
            })
          },
          {
            parentContext:
              externalParentContext ??
              flow.getParentContext() ??
              context.active(),
            attributes: {
              "safe.connected": safeConnected,
            },
          },
        )
        if (!useExternalFlow) {
          flow.endSuccess()
        }
        return result
      } catch (error) {
        if (!useExternalFlow) {
          flow.endError(error, {
            "market.address": marketAddress?.toLowerCase() ?? "",
          })
        }
        throw error
      }
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
