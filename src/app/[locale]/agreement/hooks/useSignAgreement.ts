import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

import { toastRequest } from "@/components/Toasts"
import { TargetNetwork } from "@/config/network"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import { SHOULD_REDIRECT_KEY } from "@/providers/RedirectsProvider/hooks/useShouldRedirect"
import { ROUTES } from "@/routes"

import { SignatureSubmissionProps } from "./interface"

const DATE_FORMAT = "MMMM DD, YYYY"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
}

export async function submitSignature(input: SignatureSubmissionProps) {
  const network = TargetNetwork.stringID


  await fetch(`/api/sla`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      network,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
}

export const useSignAgreement = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const { replace } = useRouter()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)

      const sign = async () => {
        const dateSigned = dayjs(timeSigned).format(DATE_FORMAT)
        let agreementText = AgreementText
        if (dateSigned) {
          agreementText = `${agreementText}\n\nDate: ${dateSigned}`
        }

        if (sdk && safeConnected) {
          const settings = {
            offChainSigning: true,
          }
          console.log(
            `Set safe settings: ${await sdk.eth.setSafeSettings([settings])}`,
          )

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
      await submitSignature({
        signature: result.signature ?? "0x",
        name,
        timeSigned,
        address,
      })
      return result
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [SHOULD_REDIRECT_KEY] })
      client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
      replace(ROUTES.borrower.root)
    },
    onError(error) {
      console.log(error)
    },
  })
}
