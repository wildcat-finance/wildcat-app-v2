// app/lib/use-consent.ts

"use client"

import { useSyncExternalStore } from "react"

import Cookies from "js-cookie"

type Consent = "accepted" | "declined" | undefined

export function useConsent(): Consent {
  function subscribe(callback: () => void) {
    window.addEventListener("storage", callback)
    return () => window.removeEventListener("storage", callback)
  }

  return useSyncExternalStore(
    subscribe,
    () => Cookies.get("tracking_consent") as Consent,
  )
}
