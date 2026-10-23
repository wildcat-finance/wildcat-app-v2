"use client"

import GlobalSafeProvider from "@safe-global/safe-apps-react-sdk"

import { GenericProviderProps } from "@/providers/interface"

import { useAutoConnect, WalletStartupContext } from "./WagmiQueryProviders"

export const SafeProvider = ({ children }: GenericProviderProps) => {
  const ready = useAutoConnect()

  return (
    <GlobalSafeProvider>
      <WalletStartupContext.Provider value={ready}>
        {children}
      </WalletStartupContext.Provider>
    </GlobalSafeProvider>
  )
}
