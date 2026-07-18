"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { toastError, toastRequest, toastSuccess } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { SLA_STATUS_QUERY_KEY } from "@/hooks/useNetworkGate"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import { useAppSelector } from "@/store/hooks"
import {
  buildServiceAgreementDeclineMessage,
  buildServiceAgreementMessage,
  normalizeServiceAgreementDeclineReason,
  SERVICE_AGREEMENT_SIGNATURE_MAX_AGE_MS,
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
      if (res.status === 404) return { party: "Lender" as const }
      if (!res.ok) throw Error(`Failed to load account role`)
      const { profile } = (await res.json()) as {
        profile: { name?: string } | null
      }
      if (profile?.name)
        return { party: "Borrower" as const, organizationName: profile.name }
      return { party: "Lender" as const }
    },
  })
}

const invalidateToUQueries = async (
  client: ReturnType<typeof useQueryClient>,
  chainId: number,
  address: string | undefined,
) => {
  await client.invalidateQueries({
    queryKey: [SLA_STATUS_QUERY_KEY],
    exact: false,
  })
  await client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
  await client.invalidateQueries({
    queryKey: QueryKeys.ServiceAgreement.GET_STATUS(chainId, address),
  })
}

/// Accept the CURRENT ToU version (re-acceptance path, both parties).
export const useAcceptToU = () => {
  const { address } = useAccount()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()
  const partyQuery = useAccountToUParty()
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)
      if (!partyQuery.data) throw Error(`Account role not loaded`)
      if (signer.chainId !== selectedChainId) throw Error(`Wrong network`)
      const { party, organizationName } = partyQuery.data
      const timeSigned = Date.now()
      const signPromise = safeSigning.signMessage({
        flow: "tou-accept",
        address,
        chainId: selectedChainId,
        timeSigned,
        expiresAt: timeSigned + SERVICE_AGREEMENT_SIGNATURE_MAX_AGE_MS,
        buildMessage: (effectiveTimeSigned) =>
          buildServiceAgreementMessage({
            acknowledgementText: currentAgreement.data.acknowledgementText,
            timeSigned: effectiveTimeSigned,
            chainId: selectedChainId,
            organizationName,
          }),
      })
      const signed = safeSigning.safeConnected
        ? await signPromise
        : await toastRequest(signPromise, {
            pending: `Waiting For Signature...`,
            success: `Terms of Use signature ready!`,
            error: `Failed to sign Terms of Use!`,
          })
      safeSigning.markSubmitting(signed.pendingSafeMessageId)
      try {
        const result = await fetch(`/api/service-agreement/accept`, {
          method: "POST",
          body: JSON.stringify({
            address: address.toLowerCase(),
            chainId: selectedChainId,
            signature: signed.signature,
            timeSigned: signed.timeSigned,
            party,
          }),
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }).then((res) => res.json())
        if (!result.success) throw Error(`Failed to submit signature`)
        safeSigning.markCompleted(signed.pendingSafeMessageId)
        toastSuccess("Terms of Use accepted.")
      } catch (error) {
        safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
        toastError("Failed to submit ToU signature.")
        throw error
      }
    },
    onSuccess: () => invalidateToUQueries(client, selectedChainId, address),
    onError(error) {
      console.log(error)
    },
  })

  return {
    ...mutation,
    party: partyQuery.data,
    isReady:
      !!currentAgreement.data &&
      !!partyQuery.data &&
      !partyQuery.isError &&
      !!signer &&
      signer.chainId === selectedChainId &&
      !!address,
  }
}

/// Decline the CURRENT ToU version - wallet-signs an unambiguous refusal
/// message (never confusable with an acceptance) and records it.
export const useDeclineToU = () => {
  const { address } = useAccount()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()
  const partyQuery = useAccountToUParty()
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const pendingSafeMessages = useAppSelector(
    (state) => state.pendingSafeMessages.records,
  )

  const pendingReason = (() => {
    if (!address || !currentAgreement.data || !partyQuery.data) return undefined
    const { party, organizationName } = partyQuery.data
    const matching = Object.values(pendingSafeMessages)
      .filter(
        (record) =>
          record.flow === "tou-decline" &&
          record.address === address.toLowerCase() &&
          record.chainId === selectedChainId &&
          record.status !== "failed" &&
          (!record.expiresAt || record.expiresAt > Date.now()) &&
          typeof record.context?.reason === "string",
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .find(
        (record) =>
          buildServiceAgreementDeclineMessage({
            version: currentAgreement.data.version,
            plaintextSha256: currentAgreement.data.plaintextSha256,
            timeSigned: record.timeSigned,
            chainId: selectedChainId,
            party,
            organizationName,
            reason: String(record.context?.reason),
          }) === record.message,
      )
    return matching ? String(matching.context?.reason ?? "") : undefined
  })()

  const mutation = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)
      if (!partyQuery.data) throw Error(`Account role not loaded`)
      if (signer.chainId !== selectedChainId) throw Error(`Wrong network`)
      const { party, organizationName } = partyQuery.data
      const reasonToSign = normalizeServiceAgreementDeclineReason(reason)
      const timeSigned = Date.now()
      const signPromise = safeSigning.signMessage({
        flow: "tou-decline",
        address,
        chainId: selectedChainId,
        timeSigned,
        expiresAt: timeSigned + SERVICE_AGREEMENT_SIGNATURE_MAX_AGE_MS,
        context: { reason: reasonToSign ?? "" },
        canResumePending: (context) =>
          String(context?.reason ?? "") === (reasonToSign ?? ""),
        buildMessage: (effectiveTimeSigned, context) =>
          buildServiceAgreementDeclineMessage({
            version: currentAgreement.data.version,
            plaintextSha256: currentAgreement.data.plaintextSha256,
            timeSigned: effectiveTimeSigned,
            chainId: selectedChainId,
            party,
            organizationName,
            reason: normalizeServiceAgreementDeclineReason(
              String(context?.reason ?? reasonToSign ?? ""),
            ),
          }),
      })
      const signed = safeSigning.safeConnected
        ? await signPromise
        : await toastRequest(signPromise, {
            pending: `Waiting For Signature...`,
            success: `Terms of Use decline signature ready.`,
            error: `Failed to sign the decline message!`,
          })
      safeSigning.markSubmitting(signed.pendingSafeMessageId)
      const signedReason = normalizeServiceAgreementDeclineReason(
        String(signed.context?.reason ?? reasonToSign ?? ""),
      )
      try {
        const result = await fetch(`/api/service-agreement/decline`, {
          method: "POST",
          body: JSON.stringify({
            address: address.toLowerCase(),
            chainId: selectedChainId,
            signature: signed.signature,
            timeSigned: signed.timeSigned,
            party,
            ...(signedReason ? { reason: signedReason } : {}),
          }),
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }).then((res) => res.json())
        if (!result.success) throw Error(`Failed to submit decline`)
        safeSigning.markCompleted(signed.pendingSafeMessageId)
        toastSuccess("Terms of Use declined.")
      } catch (error) {
        safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
        toastError("Failed to submit the decline.")
        throw error
      }
    },
    onSuccess: () => invalidateToUQueries(client, selectedChainId, address),
    onError(error) {
      console.log(error)
    },
  })

  return {
    ...mutation,
    party: partyQuery.data,
    pendingReason,
    isReady:
      !!currentAgreement.data &&
      !!partyQuery.data &&
      !partyQuery.isError &&
      !!signer &&
      signer.chainId === selectedChainId &&
      !!address,
  }
}
