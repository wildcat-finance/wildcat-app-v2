"use client"

import { useSyncExternalStore } from "react"

import { useConfig } from "wagmi"

type PersistHydrationStore = {
  persist: {
    hasHydrated: () => boolean
    onFinishHydration: (listener: () => void) => () => void
  }
}

export const useWagmiHydrated = () => {
  const config = useConfig()
  // Wagmi does not expose its persisted-store hydration through a public hook.
  // eslint-disable-next-line no-underscore-dangle
  const { persist } = config._internal.store as unknown as PersistHydrationStore

  return useSyncExternalStore(
    persist.onFinishHydration,
    persist.hasHydrated,
    () => false,
  )
}
