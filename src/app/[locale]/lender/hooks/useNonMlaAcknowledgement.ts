import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { NonMlaAcknowledgementResponse } from "@/app/api/mla/[market]/acknowledgement/interface"
import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { isTerminalClientError } from "@/utils/httpStatus"
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
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
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

      const doSubmit = async () => {
        const signed = await safeSigning.signMessage({
          flow: "non-mla-acknowledgement",
          address: lenderAddress,
          chainId,
          timeSigned: Date.now(),
          buildMessage: () => acknowledgementText,
        })
        safeSigning.markSubmitting(signed.pendingSafeMessageId)
        try {
          const response = await fetch(
            `/api/mla/${marketAddress.toLowerCase()}/acknowledgement`,
            {
              method: "POST",
              body: JSON.stringify({
                chainId,
                address: lenderAddress,
                signature: signed.signature,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
          if (response.status !== 200) {
            // A terminal rejection can never succeed on resubmit (e.g. the
            // borrower's stored name changed, so the server-rebuilt text no
            // longer matches this signature) - discard the pending record so
            // the next attempt proposes a fresh message.
            if (isTerminalClientError(response.status)) {
              safeSigning.markCompleted(signed.pendingSafeMessageId)
            }
            // 409 means an acknowledgement is already stored (a lost
            // response): refetch it so the deposit gate unblocks without
            // asking for a re-sign.
            if (response.status === 409) {
              client.invalidateQueries({
                queryKey: QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
                  chainId,
                  marketAddress,
                  lenderAddress,
                ),
              })
            }
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
          safeSigning.markCompleted(signed.pendingSafeMessageId)
          return true
        } catch (error) {
          safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
          throw error
        }
      }

      await toastRequest(doSubmit(), {
        success: "Acknowledgement signed",
        error: "Failed to sign acknowledgement",
        pending: safeSigning.safeConnected
          ? "Awaiting Safe confirmations — you may leave this page."
          : "Signing acknowledgement...",
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
