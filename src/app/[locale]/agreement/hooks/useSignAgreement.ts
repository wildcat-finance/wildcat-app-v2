import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { toastError, toastRequest } from "@/components/Toasts"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { SLA_STATUS_QUERY_KEY } from "@/hooks/useNetworkGate"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import { formatUnixMsAsDate } from "@/utils/formatters"

import { SignatureSubmissionProps } from "./interface"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
}

const toPreview = (value: string, prefixLength = 10, suffixLength = 8) => {
  if (value.length <= prefixLength + suffixLength + 3) return value
  return `${value.slice(0, prefixLength)}...${value.slice(-suffixLength)}`
}

const toSignaturePreview = (signature?: string) => {
  if (!signature) return undefined
  return toPreview(signature)
}

export async function submitSignature(input: SignatureSubmissionProps) {
  const result = await fetch(`/api/sla`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      chainId: input.chainId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  }).then((res) => res.json())
  if (!result.success) {
    throw Error(`Failed to submit signature`)
  }
}

export const useSignAgreement = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const router = useRouter()
  const client = useQueryClient()
  const flow = useFlowMutation()

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      flow.start("agreement.sign.flow", {
        "agreement.address": address?.toLowerCase() ?? "",
        "safe.connected": safeConnected,
      })

      try {
        const result = await withClientSpan(
          "agreement.sign",
          async (span) => {
            if (!signer) throw Error(`No signer`)
            if (!address) throw Error(`No address`)
            if (!name) throw Error(`No organization name`)

            span.setAttributes({
              "agreement.address": address.toLowerCase(),
              "operation.kind": "signature",
            })

            const sign = async () => {
              let agreementText = AgreementText
              if (timeSigned) {
                const dateSigned = formatUnixMsAsDate(timeSigned)
                agreementText = `${agreementText}\n\nDate: ${dateSigned}`
              }

              if (sdk && safeConnected) {
                const settings = {
                  offChainSigning: true,
                }
                const settingsResult = await sdk.eth.setSafeSettings([settings])
                logger.info({ settingsResult }, "Set safe settings")

                const signatureResponse =
                  await sdk.txs.signMessage(agreementText)

                if ("safeTxHash" in signatureResponse) {
                  span.setAttribute(
                    "safe.tx_hash",
                    signatureResponse.safeTxHash,
                  )
                  return {
                    signature: undefined,
                    safeTxHash: signatureResponse.safeTxHash,
                  }
                }
                if ("signature" in signatureResponse) {
                  return {
                    signature: signatureResponse.signature as string,
                    safeTxHash: undefined,
                  }
                }
              }
              const signatureResult = await signer.signMessage(agreementText)
              return { signature: signatureResult }
            }
            let signedResult: { signature?: string; safeTxHash?: string } = {}
            await toastRequest(
              sign().then((res) => {
                signedResult = res
              }),
              {
                pending: `Waiting For Signature...`,
                success: `Terms of Use signed!`,
                error: `Failed to sign Terms of Use!`,
              },
            )

            if (signedResult.signature) {
              logger.info(
                {
                  signaturePreview: toSignaturePreview(signedResult.signature),
                  name,
                  timeSigned,
                  address,
                },
                "Got signature",
              )
            } else if (signedResult.safeTxHash) {
              logger.info(
                { safeTxHash: signedResult.safeTxHash },
                "Got safe tx hash",
              )
            }
            await submitSignature({
              signature: signedResult.signature ?? "0x",
              name,
              timeSigned,
              address,
              chainId: signer.chainId,
            }).catch((error) => {
              toastError("Failed to submit TOU signature.")
              throw error
            })
            return signedResult
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "safe.connected": safeConnected,
            },
          },
        )
        flow.endSuccess()
        return result
      } catch (error) {
        flow.endError(error)
        throw error
      }
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: [SLA_STATUS_QUERY_KEY],
        exact: false,
      })
      client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
      router.back()
    },
    onError(error) {
      logger.error({ err: error }, "Failed to sign agreement")
    },
  })
}
