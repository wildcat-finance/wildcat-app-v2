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

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)
      if (!timeSigned) throw Error(`No time signed`)
      if (!token) throw Error(`No token`)
      if (!chainId) throw Error(`No chain ID selected`)

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

          const result = await sdk.txs.signMessage(agreementText)

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
        const signatureResult = await signer.signMessage(agreementText)
        return { signature: signatureResult }
      }
      let result: { signature?: string; safeTxHash?: string } = {}
      await toastRequest(
        sign().then((res) => {
          result = res
        }),
        {
          pending: `Waiting for signature...`,
          success: `Terms of Use signed!`,
          error: `Failed to sign Terms of Use!`,
        },
      )

      if (result.signature) {
        logger.info(
          {
            signature: result.signature,
            name,
            timeSigned,
            address,
          },
          "Got signature",
        )
      } else if (result.safeTxHash) {
        const safeTx = await sdk?.txs.getBySafeTxHash(result.safeTxHash)
        logger.info(
          { safeTxHash: result.safeTxHash, safeTx },
          "Got safe tx hash",
        )
      }
      const response = await fetch("/api/invite", {
        method: "PUT",
        body: JSON.stringify({
          chainId,
          signature: result.signature ?? "0x",
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
      return result
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
