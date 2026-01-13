import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { toastError, toastRequest } from "@/components/Toasts"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import { SHOULD_REDIRECT_KEY } from "@/providers/RedirectsProvider/hooks/useShouldRedirect"
import { formatUnixMsAsDate } from "@/utils/formatters"

import { SignatureSubmissionProps } from "./interface"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
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

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)

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
          pending: `Waiting For Signature...`,
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
      await submitSignature({
        signature: result.signature ?? "0x",
        name,
        timeSigned,
        address,
        chainId: signer.chainId,
      }).catch((error) => {
        toastError("Failed to submit TOU signature.")
        throw error
      })
      return result
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [SHOULD_REDIRECT_KEY] })
      client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
      router.back()
    },
    onError(error) {
      logger.error({ err: error }, "Failed to sign agreement")
    },
  })
}
