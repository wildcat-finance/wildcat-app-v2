import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { NonMlaAcknowledgementResponse } from "@/app/api/mla/[market]/acknowledgement/interface"
import { toastRequest } from "@/components/Toasts"
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
      marketName,
      borrowerLegalName,
      borrowerAlias,
      networkName,
      chainId,
    }: {
      lenderAddress: string
      marketAddress: string
      marketName: string
      borrowerLegalName: string
      borrowerAlias?: string
      networkName: string
      chainId: number
    }) => {
      if (!signer) throw Error("No signer")
      if (signer.chainId !== chainId) {
        throw Error("Wallet network does not match market chain")
      }

      const acknowledgementText = buildNonMlaAcknowledgementText({
        marketAddress,
        marketName,
        borrowerLegalName,
        borrowerAlias,
        networkName,
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
            }),
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
        if (response.status !== 200) {
          throw Error("Failed to submit non-MLA acknowledgement")
        }
        const acknowledgement =
          (await response.json()) as NonMlaAcknowledgementResponse

        // Cache the server row immediately so handoffs from this modal can
        // proceed before the invalidation refetch resolves.
        client.setQueryData<NonMlaAcknowledgementResponse>(
          QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
            chainId,
            marketAddress,
            lenderAddress,
          ),
          acknowledgement,
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
