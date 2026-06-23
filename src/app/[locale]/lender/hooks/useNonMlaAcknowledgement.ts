import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import {
  NonMlaAcknowledgementInput,
  NonMlaAcknowledgementResponse,
} from "@/app/api/mla/[market]/acknowledgement/interface"
import { toastRequest } from "@/components/Toasts"
import { NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION } from "@/config/non-mla-acknowledgement"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { buildNonMlaAcknowledgementText } from "@/utils/nonMlaAcknowledgementMessage"

export const useGetNonMlaAcknowledgement = ({
  marketAddress,
  chainId,
  enabled = true,
}: {
  marketAddress: string | undefined
  chainId: number | undefined
  enabled?: boolean
}) => {
  const { address } = useAccount()

  const getAcknowledgement = async () => {
    if (!marketAddress || !chainId || !address) return undefined
    const res = await fetch(
      `/api/mla/${marketAddress.toLowerCase()}/acknowledgement?chainId=${chainId}&lenderAddress=${address.toLowerCase()}`,
    )
    if (res.status === 200) {
      return (await res.json()) as NonMlaAcknowledgementResponse
    }
    if (res.status === 404) {
      return null
    }
    throw new Error("Failed to fetch non-MLA acknowledgement")
  }

  return useQuery({
    queryKey: QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
      chainId ?? 0,
      marketAddress,
      address,
    ),
    queryFn: getAcknowledgement,
    enabled: enabled && !!marketAddress && !!chainId && !!address,
  })
}

export const useSignNonMlaAcknowledgement = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lenderAddress,
      marketAddress,
      chainId,
      timeSigned,
    }: {
      lenderAddress: string
      marketAddress: string
      chainId: number
      timeSigned: number
    }) => {
      if (!signer) throw Error("No signer")
      if (signer.chainId !== chainId) {
        throw Error("Wallet network does not match market chain")
      }

      const acknowledgementText = buildNonMlaAcknowledgementText({
        market: marketAddress,
        chainId,
      })

      const signMessage = async () => {
        if (sdk && safeConnected) {
          await sdk.eth.setSafeSettings([
            {
              offChainSigning: true,
            },
          ])

          const result = await sdk.txs.signMessage(acknowledgementText)

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
        const signatureResult = await signer.signMessage(acknowledgementText)
        return {
          signature: signatureResult,
          safeTxHash: undefined,
        }
      }

      const doSubmit = async () => {
        const { signature } = await signMessage()
        const response = await fetch(
          `/api/mla/${marketAddress.toLowerCase()}/acknowledgement`,
          {
            method: "POST",
            body: JSON.stringify({
              chainId,
              address: lenderAddress,
              signature: signature ?? "0x",
              timeSigned,
            } as NonMlaAcknowledgementInput),
          },
        )
        if (response.status !== 200) {
          throw Error("Failed to submit non-MLA acknowledgement")
        }

        // Optimistically mark the acknowledgement as present so consumers that
        // re-check on the next render (e.g. the mobile deposit flow handing off
        // from this modal) see it immediately, before the invalidation refetch
        // below resolves. The refetch then replaces this with the server record.
        client.setQueryData<NonMlaAcknowledgementResponse>(
          QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
            chainId,
            marketAddress,
            lenderAddress,
          ),
          {
            kind: safeConnected ? "GnosisSignature" : "ECDSA",
            address: lenderAddress.toLowerCase(),
            signer: lenderAddress.toLowerCase(),
            signature: signature ?? "0x",
            chainId,
            market: marketAddress.toLowerCase(),
            acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
            acknowledgementText,
            timeSigned: new Date(timeSigned),
          },
        )
        return true
      }

      await toastRequest(doSubmit(), {
        success: "Acknowledgement signed",
        error: "Failed to sign acknowledgement",
        pending: "Signing acknowledgement...",
      })
    },
    onSuccess(_, variables) {
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
          variables.chainId,
          variables.marketAddress,
          variables.lenderAddress,
        ),
      })
    },
  })
}
