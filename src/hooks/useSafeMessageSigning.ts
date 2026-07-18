"use client"

import { useCallback } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useAccount } from "wagmi"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import {
  getPendingSafeMessageId,
  proposeSafeMessage,
} from "@/lib/safeMessageSigning"
import { useAppDispatch, useAppStore } from "@/store/hooks"
import {
  addPendingSafeMessage,
  markSafeMessageSubmitting,
  markSafeMessageSubmissionFailed,
  PendingSafeMessage,
  removePendingSafeMessage,
  SafeMessageFlow,
} from "@/store/slices/pendingSafeMessagesSlice/pendingSafeMessagesSlice"

export type MessageToSign = {
  flow: SafeMessageFlow
  address: string
  chainId: number
  timeSigned: number
  buildMessage: (
    timeSigned: number,
    context?: Record<string, string | number | boolean>,
  ) => string | Promise<string>
  expiresAt?: number
  context?: Record<string, string | number | boolean>
  canResumePending?: (
    context?: Record<string, string | number | boolean>,
  ) => boolean
}

export type WalletMessageSignature = {
  signature: string
  message: string
  timeSigned: number
  pendingSafeMessageId?: string
  context?: Record<string, string | number | boolean>
}

const isSameScope = (
  record: PendingSafeMessage,
  flow: SafeMessageFlow,
  address: string,
  chainId: number,
) =>
  record.flow === flow &&
  record.address === address.toLowerCase() &&
  record.chainId === chainId

const waitForSafeSignature = (
  store: ReturnType<typeof useAppStore>,
  id: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const check = () => {
      const record = store.getState().pendingSafeMessages.records[id]
      if (!record) {
        reject(new Error("Pending Safe message was removed"))
        return true
      }
      if (record.signature) {
        resolve(record.signature)
        return true
      }
      if (record.status === "failed") {
        reject(new Error(record.lastError || "Safe message signing failed"))
        return true
      }
      return false
    }
    if (check()) return
    const unsubscribe = store.subscribe(() => {
      if (check()) unsubscribe()
    })
  })

export const useSafeMessageSigning = () => {
  const { sdk, connected: safeConnected, safe } = useSafeAppsSDK()
  const { connector } = useAccount()
  const signer = useEthersSigner()
  const dispatch = useAppDispatch()
  const store = useAppStore()

  const getPendingForFlow = useCallback(
    (flow: SafeMessageFlow, address: string, chainId: number) =>
      Object.values(store.getState().pendingSafeMessages.records)
        .filter((record) => isSameScope(record, flow, address, chainId))
        .sort((a, b) => b.createdAt - a.createdAt),
    [store],
  )

  const resumePendingMessage = useCallback(
    async (record: PendingSafeMessage): Promise<WalletMessageSignature> => {
      if (record.expiresAt && record.expiresAt <= Date.now()) {
        dispatch(removePendingSafeMessage(record.id))
        throw new Error("Pending Safe message expired")
      }
      const signature =
        record.signature ?? (await waitForSafeSignature(store, record.id))
      return {
        signature,
        message: record.message,
        timeSigned: record.timeSigned,
        pendingSafeMessageId: record.id,
        context: record.context,
      }
    },
    [dispatch, store],
  )

  const signMessage = useCallback(
    async (input: MessageToSign): Promise<WalletMessageSignature> => {
      if (!signer) throw new Error("No signer")
      if (signer.chainId !== input.chainId) {
        throw new Error("Wallet network does not match signing network")
      }

      const isSafeWallet = connector?.id === "safe" || safeConnected
      if (isSafeWallet && (!sdk || !safeConnected)) {
        throw new Error("Safe connection is not ready")
      }

      if (!isSafeWallet) {
        if (
          (await signer.getAddress()).toLowerCase() !==
          input.address.toLowerCase()
        ) {
          throw new Error("Wallet account does not match signing account")
        }
        const message = await input.buildMessage(
          input.timeSigned,
          input.context,
        )
        return {
          signature: await signer.signMessage(message),
          message,
          timeSigned: input.timeSigned,
          context: input.context,
        }
      }

      if (
        safe.chainId !== input.chainId ||
        safe.safeAddress?.toLowerCase() !== input.address.toLowerCase()
      ) {
        throw new Error("Connected Safe does not match signing account")
      }

      const records = getPendingForFlow(
        input.flow,
        input.address,
        input.chainId,
      )
      const discarded = records.filter(
        (record) =>
          record.status === "failed" ||
          (record.expiresAt && record.expiresAt <= Date.now()),
      )
      discarded.forEach((record) =>
        dispatch(removePendingSafeMessage(record.id)),
      )
      const candidates = await Promise.all(
        records
          .filter(
            (record) =>
              !discarded.includes(record) &&
              (!input.canResumePending ||
                input.canResumePending(record.context)),
          )
          .map(async (record) => ({
            record,
            rebuiltMessage: await input.buildMessage(
              record.timeSigned,
              record.context,
            ),
          })),
      )
      const matching = candidates.find(
        ({ record, rebuiltMessage }) => rebuiltMessage === record.message,
      )
      if (matching) return resumePendingMessage(matching.record)

      const message = await input.buildMessage(input.timeSigned, input.context)
      const proposal = await proposeSafeMessage(sdk, message)
      const id = getPendingSafeMessageId({
        chainId: input.chainId,
        address: input.address,
        proposal,
      })
      const record: PendingSafeMessage = {
        id,
        flow: input.flow,
        address: input.address.toLowerCase(),
        chainId: input.chainId,
        message,
        timeSigned: input.timeSigned,
        kind: proposal.kind,
        ...(proposal.kind === "offchain"
          ? { messageHash: proposal.messageHash }
          : { safeTxHash: proposal.safeTxHash }),
        status: "awaitingConfirmations",
        createdAt: Date.now(),
        expiresAt: input.expiresAt,
        context: input.context,
      }
      dispatch(addPendingSafeMessage(record))
      return resumePendingMessage(record)
    },
    [
      dispatch,
      connector?.id,
      getPendingForFlow,
      resumePendingMessage,
      safeConnected,
      safe.chainId,
      safe.safeAddress,
      sdk,
      signer,
    ],
  )

  const markSubmitting = useCallback(
    (id: string | undefined) => {
      if (id) dispatch(markSafeMessageSubmitting(id))
    },
    [dispatch],
  )
  const markSubmissionFailed = useCallback(
    (id: string | undefined, error: unknown) => {
      if (!id) return
      dispatch(
        markSafeMessageSubmissionFailed({
          id,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
    [dispatch],
  )
  const markCompleted = useCallback(
    (id: string | undefined) => {
      if (id) dispatch(removePendingSafeMessage(id))
    },
    [dispatch],
  )

  return {
    safeConnected: !!sdk && safeConnected,
    signMessage,
    getPendingForFlow,
    resumePendingMessage,
    markSubmitting,
    markSubmissionFailed,
    markCompleted,
  }
}
