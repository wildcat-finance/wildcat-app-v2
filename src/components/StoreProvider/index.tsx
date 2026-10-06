"use client"

import { useEffect, useLayoutEffect, useRef } from "react"

import { Provider } from "react-redux"
import { Persistor, persistStore, REHYDRATE } from "redux-persist"

import { AppStore, makeStore } from "@/store/store"

// Server renders never run layout effects; the alias only silences React's
// SSR warning for useLayoutEffect.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

const SELECTED_NETWORK_STORAGE_KEY = "persist:selectedNetwork"

// Every network-gated query waits for the selectedNetwork slice to rehydrate,
// but persistStore restores it asynchronously - a task after first paint.
// Replay the stored slice through redux-persist's own REHYDRATE action
// synchronously after hydration instead: same parsing, same reducer path,
// same merge semantics, just without the wait. Runs in a layout effect so the
// server-rendered markup (default network) is matched during hydration and
// the switch happens before paint.
const rehydrateSelectedNetworkSync = (store: AppStore) => {
  let payload: Record<string, unknown> | undefined
  try {
    const raw = window.localStorage.getItem(SELECTED_NETWORK_STORAGE_KEY)
    if (raw) {
      const rawState = JSON.parse(raw) as Record<string, string>
      payload = Object.fromEntries(
        Object.entries(rawState).map(([field, value]) => [
          field,
          JSON.parse(value),
        ]),
      )
    }
  } catch {
    // Unreadable persisted state: rehydrate with defaults, exactly like
    // redux-persist does when storage is empty
    payload = undefined
  }
  store.dispatch({ type: REHYDRATE, key: "selectedNetwork", payload })
}

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const storeRef = useRef<AppStore>()
  const persistorRef = useRef<Persistor>()
  if (!storeRef.current) {
    storeRef.current = makeStore()
  }

  useIsomorphicLayoutEffect(() => {
    if (!persistorRef.current && storeRef.current) {
      rehydrateSelectedNetworkSync(storeRef.current)
      persistorRef.current = persistStore(storeRef.current)
    }
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
