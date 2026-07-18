"use client"

import { useEffect, useMemo, useRef } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import toast from "react-hot-toast"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  markSafeMessageFailed,
  markSafeMessagePollError,
  markSafeMessageSignatureReady,
  PendingSafeMessage,
} from "@/store/slices/pendingSafeMessagesSlice/pendingSafeMessagesSlice"

const POLL_INTERVAL_MS = 15_000

const flowLabels: Record<PendingSafeMessage["flow"], string> = {
  login: "login",
  "initial-tou": "Terms of Use acceptance",
  "tou-accept": "Terms of Use acceptance",
  "tou-decline": "Terms of Use decline",
  "invitation-accept": "invitation acceptance",
  "borrower-market-mla": "market agreement",
  "borrower-mla": "market agreement",
  "borrower-mla-decline": "market agreement decline",
  "lender-mla": "lender agreement",
  "non-mla-acknowledgement": "market acknowledgement",
}

const toastId = (id: string) => `safe-message:${id}`

export const SafeMessageCoordinator = () => {
  const { sdk, connected, safe } = useSafeAppsSDK()
  const dispatch = useAppDispatch()
  const records = useAppSelector((state) => state.pendingSafeMessages.records)
  const previousIds = useRef<Set<string>>(new Set())
  const scopedRecordsRef = useRef<PendingSafeMessage[]>([])

  const scopedRecords = useMemo(
    () =>
      Object.values(records).filter(
        (record) =>
          connected &&
          record.address === safe.safeAddress?.toLowerCase() &&
          record.chainId === safe.chainId,
      ),
    [connected, records, safe.chainId, safe.safeAddress],
  )
  scopedRecordsRef.current = scopedRecords
  const awaitingRecordKey = scopedRecords
    .filter(({ status }) => status === "awaitingConfirmations")
    .map(({ id }) => id)
    .sort()
    .join("|")

  useEffect(() => {
    const currentIds = new Set(scopedRecords.map(({ id }) => id))
    previousIds.current.forEach((id) => {
      if (!currentIds.has(id)) toast.dismiss(toastId(id))
    })
    scopedRecords.forEach((record) => {
      const id = toastId(record.id)
      const label = flowLabels[record.flow]
      if (record.status === "awaitingConfirmations") {
        toast.loading(
          `Awaiting Safe confirmations for ${label} — you may leave this page.`,
          { id },
        )
      } else if (record.status === "signatureReady") {
        if (record.lastError) {
          toast.error(
            `Safe signature ready, but ${label} submission failed. Retry the action.`,
            { id },
          )
        } else {
          toast.success(`Safe signature ready for ${label}.`, { id })
        }
      } else if (record.status === "failed") {
        toast.error(record.lastError || `Safe ${label} failed.`, { id })
      }
    })
    previousIds.current = currentIds
  }, [scopedRecords])

  useEffect(() => {
    if (!connected || !sdk) return undefined
    let stopped = false
    let polling = false

    const poll = async () => {
      if (
        stopped ||
        polling ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      ) {
        return
      }
      polling = true
      const pending = scopedRecordsRef.current.filter(
        ({ status }) => status === "awaitingConfirmations",
      )
      await Promise.all(
        pending.map(async (record) => {
          if (record.expiresAt && record.expiresAt <= Date.now()) {
            dispatch(
              markSafeMessageFailed({
                id: record.id,
                error: "Safe signing request expired",
              }),
            )
            return
          }
          try {
            if (record.kind === "offchain" && record.messageHash) {
              const signature = await sdk.safe.getOffChainSignature(
                record.messageHash,
              )
              if (signature) {
                const isValid = await sdk.safe.isMessageSigned(
                  record.message,
                  signature,
                )
                if (!isValid) {
                  throw new Error("Safe returned an invalid signature")
                }
                dispatch(
                  markSafeMessageSignatureReady({ id: record.id, signature }),
                )
              }
              return
            }
            if (record.kind === "onchain" && record.safeTxHash) {
              const transaction = await sdk.txs.getBySafeTxHash(
                record.safeTxHash,
              )
              if (transaction.txStatus === "SUCCESS") {
                dispatch(
                  markSafeMessageSignatureReady({
                    id: record.id,
                    signature: "0x",
                  }),
                )
              } else if (
                transaction.txStatus === "FAILED" ||
                transaction.txStatus === "CANCELLED"
              ) {
                dispatch(
                  markSafeMessageFailed({
                    id: record.id,
                    error: `Safe message transaction ${transaction.txStatus.toLowerCase()}`,
                  }),
                )
              }
            }
          } catch (error) {
            dispatch(
              markSafeMessagePollError({
                id: record.id,
                error: error instanceof Error ? error.message : String(error),
              }),
            )
          }
        }),
      )
      polling = false
    }

    const runPoll = () => poll().catch(() => undefined)
    runPoll()
    const interval = window.setInterval(runPoll, POLL_INTERVAL_MS)
    const resume = () => runPoll()
    window.addEventListener("online", resume)
    document.addEventListener("visibilitychange", resume)
    return () => {
      stopped = true
      window.clearInterval(interval)
      window.removeEventListener("online", resume)
      document.removeEventListener("visibilitychange", resume)
    }
  }, [awaitingRecordKey, connected, dispatch, sdk])

  return null
}
