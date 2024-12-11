import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

import { SignAgreementProps } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { toastRequest } from "@/components/Toasts"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { ROUTES } from "@/routes"

import {
  USE_BORROWER_INVITE_EXISTS_KEY,
  USE_BORROWER_INVITE_KEY,
} from "../../hooks/useBorrowerInvitation"

const DATE_FORMAT = "MMMM DD, YYYY"

export const useSubmitAcceptInvitation = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { replace } = useRouter()
  const token = useAuthToken()

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)
      if (!timeSigned) throw Error(`No time signed`)
      if (!token) throw Error(`No token`)

      const sign = async () => {
        const dateSigned = dayjs(timeSigned).format(DATE_FORMAT)
        let agreementText = AgreementText
        if (dateSigned) {
          agreementText = `${agreementText}\n\nDate: ${dateSigned}`
        }

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
          success: `Service agreement signed!`,
          error: `Failed to sign service agreement!`,
        },
      )

      if (result.signature) {
        console.log(`Got Signature`)
        console.log({
          signature: result.signature,
          name,
          timeSigned,
          address,
        })
      } else if (result.safeTxHash) {
        console.log(`Got result.safeTxHash`)
        console.log(await sdk?.txs.getBySafeTxHash(result.safeTxHash))
      }
      await fetch("/api/invite", {
        method: "PUT",
        body: JSON.stringify({
          signature: result.signature ?? "0x",
          name,
          timeSigned,
          address,
        }),
      })
      return result
    },
    onSuccess: () => {
      console.log(`Invalidating queries`)
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_KEY] })
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_EXISTS_KEY] })
      replace(ROUTES.borrower.root)
    },
    onError(error) {
      console.log(error)
    },
  })
}
