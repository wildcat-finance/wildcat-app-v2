import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { toastRequest } from "@/components/Toasts"
import { API_URL } from "@/config/api"
import { TargetNetwork } from "@/config/network"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { ROUTES } from "@/routes"

import { SignatureSubmissionProps } from "./interface"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  dateSigned: string | undefined
}

export async function submitSignature(input: SignatureSubmissionProps) {
  const network = TargetNetwork.stringID
  const url = API_URL
  if (!url) throw Error(`API url not defined`)

  await fetch(`${url}/sla`, {
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

  return useMutation({
    mutationFn: async ({ address, name, dateSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)

      const sign = async () => {
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
          console.log(result)

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
        console.log(`Signing message with EOA`)
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
          dateSigned,
          address,
        })
      } else if (result.safeTxHash) {
        console.log(`Got result.safeTxHash`)
        console.log(await sdk?.txs.getBySafeTxHash(result.safeTxHash))
      }
      await submitSignature({
        signature: result.signature ?? "0x",
        name,
        dateSigned,
        address,
      })
      return result
    },
    onSuccess: () => {
      replace(ROUTES.borrower.root)
    },
    onError(error) {
      console.log(error)
    },
  })
}
