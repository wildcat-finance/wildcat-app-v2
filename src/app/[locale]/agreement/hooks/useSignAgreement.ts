import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation } from "@tanstack/react-query"

//import { toastifyRequest } from "@/components/toasts"
import { toastRequest } from "@/components/Toasts"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { useEthersSigner } from "@/hooks/useEthersSigner"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  dateSigned: string | undefined
}

export const useSignAgreement = () => {
  const { sdk } = useSafeAppsSDK()
  const signer = useEthersSigner()

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

        if (sdk) {
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
        const signatureResult = await signer.signMessage(agreementText)
        return { signature: signatureResult }
      }
      let result: { signature?: string; safeTxHash?: string } = {}
      // await toastifyRequest(
      //   sign().then((res) => {
      //     result = res
      //   }),
      //   {
      //     pending: `Waiting for signature...`,
      //     success: `Service agreement signed!`,
      //     error: `Failed to sign service agreement!`,
      //   },
      // )
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
      return result
    },
    onError(error) {
      console.log(error)
    },
  })
}
