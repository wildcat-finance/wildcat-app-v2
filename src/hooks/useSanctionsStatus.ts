"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { screenWallet } from "@/lib/sanctions"
import {
  SANCTIONS_REFRESH_MS,
  SANCTIONS_RESULT_TTL_MS,
  SANCTIONS_TIMEOUT_MS,
  SanctionsDevOverride,
  SanctionsResult,
  SanctionsState,
} from "@/utils/sanctions"
import { WalletScope } from "@/utils/sanctionsAccess"

type Snapshot = {
  key: string
  result?: SanctionsResult
  failed: boolean
  pending: boolean
}

export function useSanctionsStatus({
  address,
  chainId,
  selectedChainId,
  enabled,
  devOverride,
}: WalletScope & { enabled: boolean; devOverride?: SanctionsDevOverride }) {
  const devAddress = devOverride?.address
  const devStatus = devOverride?.status
  const normalized = address?.toLowerCase()
  const key =
    enabled && normalized ? `${normalized}:${chainId}:${selectedChainId}` : ""
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!key || !normalized) {
      setSnapshot(undefined)
      return undefined
    }
    let stopped = false
    let pending = false
    let failed = false
    let accepted: SanctionsResult | undefined
    let controller: AbortController | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const publish = () => {
      if (!stopped) setSnapshot({ key, result: accepted, failed, pending })
    }
    const refresh = async () => {
      if (stopped || pending) return
      pending = true
      publish()
      controller = new AbortController()
      timeout = setTimeout(() => controller?.abort(), SANCTIONS_TIMEOUT_MS)
      const startedAt = Date.now()
      try {
        const data = await screenWallet(normalized, {
          signal: controller.signal,
          devOverride:
            devAddress && devStatus
              ? { address: devAddress, status: devStatus }
              : undefined,
        })
        const lifetime = Math.min(
          data.validUntil - data.checkedAt,
          SANCTIONS_RESULT_TTL_MS,
        )
        if (
          data.address !== normalized ||
          data.status === "unavailable" ||
          lifetime <= 0 ||
          startedAt + lifetime <= Date.now()
        ) {
          throw new Error("Invalid or expired screening result")
        }
        if (stopped) return
        // Subtract request time from the clearance lifetime.
        accepted = {
          ...data,
          checkedAt: startedAt,
          validUntil: startedAt + lifetime,
        }
        failed = false
        clearTimeout(expiry)
        expiry = setTimeout(
          publish,
          Math.max(0, accepted.validUntil - Date.now()),
        )
      } catch {
        failed = true
        // Retain known rejection across errors; only a positive clear result
        // releases it. A previous clear result is usable only until expiry.
      } finally {
        clearTimeout(timeout)
        pending = false
        publish()
      }
    }
    refreshRef.current = () => {
      refresh()
    }
    const onVisible = () => {
      publish()
      if (document.visibilityState !== "hidden") refresh()
    }
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") refresh()
    }, SANCTIONS_REFRESH_MS)
    window.addEventListener("focus", onVisible)
    window.addEventListener("online", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    refresh()
    return () => {
      stopped = true
      controller?.abort()
      clearTimeout(timeout)
      clearTimeout(expiry)
      clearInterval(interval)
      window.removeEventListener("focus", onVisible)
      window.removeEventListener("online", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
      refreshRef.current = () => {}
    }
  }, [key, normalized, devAddress, devStatus])

  const current = key && snapshot?.key === key ? snapshot : undefined
  let status: SanctionsState = "checking"
  if (current?.result?.status === "blocked") status = "blocked"
  else if (
    current?.result?.status === "clear" &&
    current.result.validUntil > Date.now()
  )
    status = "clear"
  else if (current?.failed || current?.result) status = "unavailable"

  return {
    status,
    validUntil: current?.result?.validUntil ?? 0,
    isRefreshing: current?.pending ?? false,
    retry: useCallback(() => refreshRef.current(), []),
  }
}
