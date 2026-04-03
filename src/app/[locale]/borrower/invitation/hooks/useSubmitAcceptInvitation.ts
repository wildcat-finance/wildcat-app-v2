import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { SignAgreementProps } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { toastRequest } from "@/components/Toasts"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
import { ROUTES } from "@/routes"
import { formatUnixMsAsDate } from "@/utils/formatters"

import {
  USE_BORROWER_INVITE_EXISTS_KEY,
  USE_BORROWER_INVITE_KEY,
} from "../../hooks/useBorrowerInvitation"

export const useSubmitAcceptInvitation = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { replace } = useRouter()
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const flow = useFlowMutation()

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      flow.start("invitation.accept.flow", {
        "safe.connected": safeConnected,
        "market.chain_id": chainId ?? 0,
        "borrower.address": address?.toLowerCase() ?? "",
      })

      try {
        const result = await withClientSpan(
          "invitation.accept",
          async (span) => {
            if (!signer) throw Error(`No signer`)
            if (!address) throw Error(`No address`)
            if (!name) throw Error(`No organization name`)
            if (!timeSigned) throw Error(`No time signed`)
            if (!token) throw Error(`No token`)
            if (!chainId) throw Error(`No chain ID selected`)

            span.setAttributes({
              "operation.kind": "signature",
              "borrower.address": address.toLowerCase(),
            })

            const sign = async () => {
              const dateSigned = formatUnixMsAsDate(timeSigned)
              let agreementText = AgreementText
              if (dateSigned) {
                agreementText = `${agreementText}\n\nDate: ${dateSigned}`
              }
              agreementText = `${agreementText}\n\nOrganization Name: ${name}`
              if (sdk && safeConnected) {
                await sdk.eth.setSafeSettings([
                  {
                    offChainSigning: true,
                  },
                ])

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
                pending: `Waiting for signature...`,
                success: `Terms of Use signed!`,
                error: `Failed to sign Terms of Use!`,
              },
            )

            if (signedResult.signature) {
              logger.info(
                {
                  signatureLength: signedResult.signature.length,
                  name,
                  timeSigned,
                  address,
                },
                "Got signature",
              )
            } else if (signedResult.safeTxHash) {
              const safeTx = await sdk?.txs.getBySafeTxHash(
                signedResult.safeTxHash,
              )
              logger.info(
                {
                  safeTxHash: signedResult.safeTxHash,
                  txHash: safeTx?.txHash,
                },
                "Got safe tx hash",
              )
            }
            const response = await fetch("/api/invite", {
              method: "PUT",
              body: JSON.stringify({
                chainId,
                signature: signedResult.signature ?? "0x",
                name,
                timeSigned,
                address,
              }),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.token}`,
              },
            })
            if (response.status === 401) {
              removeBadToken()
              throw Error("Failed to accept invitation")
            }
            const data = await response.json()
            if (!data.success) {
              throw Error("Failed to accept invitation")
            }
            return signedResult
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "safe.connected": safeConnected,
              "market.chain_id": chainId ?? 0,
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
      logger.info("Invalidating borrower invite queries")
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_KEY] })
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_EXISTS_KEY] })
      replace(ROUTES.borrower.root)
    },
    onError(error) {
      logger.error({ err: error }, "Failed to accept invitation")
    },
  })
}
