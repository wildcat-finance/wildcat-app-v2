"use client"

import { useEffect, useRef } from "react"

import { Provider } from "react-redux"
import { Persistor, persistStore } from "redux-persist"

import { AppStore, makeStore } from "@/store/store"

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

  useEffect(() => {
    if (!persistorRef.current && storeRef.current) {
      persistorRef.current = persistStore(storeRef.current)
    }
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
