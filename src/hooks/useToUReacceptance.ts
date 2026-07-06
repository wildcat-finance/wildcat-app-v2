"use client"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { toastError, toastRequest } from "@/components/Toasts"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { SLA_STATUS_QUERY_KEY } from "@/hooks/useNetworkGate"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import {
  buildServiceAgreementDeclineMessage,
  buildServiceAgreementMessage,
} from "@/utils/serviceAgreementMessage"

export const TOU_PARTY_QUERY_KEY = "tou-party"

export type AccountToUParty = {
  party: ServiceAgreementPartyInput
  organizationName?: string
}

/// Which party hat the connected account re-accepts under. Accounts with a
/// named borrower profile sign the borrower message (organization name is
/// derived server-side from the same profile); everyone else signs as lender.
export const useAccountToUParty = () => {
  const { address } = useAccount()
  const { chainId } = useSelectedNetwork()
  return useQuery<AccountToUParty>({
    queryKey: [TOU_PARTY_QUERY_KEY, address, chainId],
    enabled:
      !!address && typeof chainId === "number" && isSupportedChainId(chainId),
    queryFn: async () => {
      const res = await fetch(
        `/api/profiles/${address?.toLowerCase()}?chainId=${chainId}`,
      )
      if (!res.ok) return { party: "Lender" as const }
      const { profile } = (await res.json()) as {
        profile: { name?: string } | null
      }
      if (profile?.name)
        return { party: "Borrower" as const, organizationName: profile.name }
      return { party: "Lender" as const }
    },
  })
}

/// Safe-aware personal_sign, mirroring useSignAgreement: off-chain Safe
/// signatures come back directly; on-chain Safe signing submits "0x" and the
/// server verifies via EIP-1271.
const useSignToUMessage = () => {
  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()
  return {
    signer,
    signMessage: async (message: string): Promise<string> => {
      if (!signer) throw Error(`No signer`)
      if (sdk && safeConnected) {
        await sdk.eth.setSafeSettings([{ offChainSigning: true }])
        const result = await sdk.txs.signMessage(message)
        if ("signature" in result && result.signature) {
          return result.signature as string
        }
        return "0x"
      }
      return signer.signMessage(message)
    },
  }
}

const invalidateToUQueries = async (
  client: ReturnType<typeof useQueryClient>,
) => {
  await client.invalidateQueries({
    queryKey: [SLA_STATUS_QUERY_KEY],
    exact: false,
  })
  await client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
}

/// Accept the CURRENT ToU version (re-acceptance path, both parties).
export const useAcceptToU = () => {
  const { address } = useAccount()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()
  const partyQuery = useAccountToUParty()
  const { signer, signMessage } = useSignToUMessage()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)
      if (!partyQuery.data) throw Error(`Account role not loaded`)
      const timeSigned = Date.now()
      const { party, organizationName } = partyQuery.data
      const message = buildServiceAgreementMessage({
        acknowledgementText: currentAgreement.data.acknowledgementText,
        timeSigned,
        organizationName,
      })
      let signature = ""
      await toastRequest(
        signMessage(message).then((sig) => {
          signature = sig
        }),
        {
          pending: `Waiting For Signature...`,
          success: `Terms of Use signed!`,
          error: `Failed to sign Terms of Use!`,
        },
      )
      const result = await fetch(`/api/service-agreement/accept`, {
        method: "POST",
        body: JSON.stringify({
          address: address.toLowerCase(),
          chainId: signer.chainId,
          signature,
          timeSigned,
          party,
        }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then((res) => res.json())
      if (!result.success) {
        toastError("Failed to submit ToU signature.")
        throw Error(`Failed to submit signature`)
      }
    },
    onSuccess: () => invalidateToUQueries(client),
    onError(error) {
      console.log(error)
    },
  })

  return {
    ...mutation,
    isReady:
      !!currentAgreement.data && !!partyQuery.data && !!signer && !!address,
  }
}

/// Decline the CURRENT ToU version - wallet-signs an unambiguous refusal
/// message (never confusable with an acceptance) and records it.
export const useDeclineToU = () => {
  const { address } = useAccount()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()
  const partyQuery = useAccountToUParty()
  const { signer, signMessage } = useSignToUMessage()

  const mutation = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)
      if (!partyQuery.data) throw Error(`Account role not loaded`)
      const timeSigned = Date.now()
      const message = buildServiceAgreementDeclineMessage({
        version: currentAgreement.data.version,
        plaintextSha256: currentAgreement.data.plaintextSha256,
        timeSigned,
      })
      let signature = ""
      await toastRequest(
        signMessage(message).then((sig) => {
          signature = sig
        }),
        {
          pending: `Waiting For Signature...`,
          success: `Terms of Use declined.`,
          error: `Failed to sign the decline message!`,
        },
      )
      const result = await fetch(`/api/service-agreement/decline`, {
        method: "POST",
        body: JSON.stringify({
          address: address.toLowerCase(),
          chainId: signer.chainId,
          signature,
          timeSigned,
          party: partyQuery.data.party,
          ...(reason ? { reason } : {}),
        }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then((res) => res.json())
      if (!result.success) {
        toastError("Failed to submit the decline.")
        throw Error(`Failed to submit decline`)
      }
    },
    onSuccess: () => invalidateToUQueries(client),
    onError(error) {
      console.log(error)
    },
  })

  return {
    ...mutation,
    isReady:
      !!currentAgreement.data && !!partyQuery.data && !!signer && !!address,
  }
}
