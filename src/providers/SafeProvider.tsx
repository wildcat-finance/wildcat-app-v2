"use client"

import GlobalSafeProvider from "@safe-global/safe-apps-react-sdk"

import { GenericProviderProps } from "@/providers/interface"

import { useAutoConnect } from "./WagmiQueryProviders"

export const SafeProvider = ({ children }: GenericProviderProps) => {
  useAutoConnect()

  return <GlobalSafeProvider>{children}</GlobalSafeProvider>
}
