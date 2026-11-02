"use client"

import { ReactNode, useEffect, useLayoutEffect, useState } from "react"

import toast from "react-hot-toast"
import { useAccount, useDisconnect } from "wagmi"
import { getAccount } from "wagmi/actions"

import { useSanctionsStatus } from "@/hooks/useSanctionsStatus"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { config } from "@/lib/config"
import { suppressAutoConnect } from "@/providers/WagmiQueryProviders"
import { useAppStore } from "@/store/hooks"
import { SanctionsDevOverride } from "@/utils/sanctions"
import {
  clearSanctionsAccess,
  setSanctionsAccess,
} from "@/utils/sanctionsAccess"

import { SanctionsScreen } from "./Screen"

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/** Screens in the background and replaces the app only for a flagged wallet. */
export function SanctionsGate({
  children,
  devOverride,
}: {
  children: ReactNode
  devOverride?: SanctionsDevOverride
}) {
  const { address, chainId, status: walletStatus } = useAccount()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const store = useAppStore()
  const [disconnectError, setDisconnectError] = useState(false)
  const { disconnectAsync, isPending: disconnecting } = useDisconnect()
  const status = useSanctionsStatus({
    address,
    chainId,
    selectedChainId,
    enabled: walletStatus === "connected",
    devOverride,
  })
  const blocked = status === "blocked"

  useBrowserLayoutEffect(() => {
    setSanctionsAccess(
      { address: address?.toLowerCase(), chainId, selectedChainId, status },
      () => {
        const account = getAccount(config)
        return {
          address: account.status === "connected" ? account.address : undefined,
          chainId: account.chainId,
          selectedChainId: store.getState().selectedNetwork.chainId,
        }
      },
    )
    if (blocked) toast.remove()
  }, [address, chainId, selectedChainId, status, blocked, store])
  useEffect(() => clearSanctionsAccess, [])

  const disconnect = async () => {
    suppressAutoConnect()
    setDisconnectError(false)
    try {
      await disconnectAsync()
    } catch {
      setDisconnectError(true)
    }
  }

  if (!blocked) return children
  return (
    <SanctionsScreen
      address={address}
      onDisconnect={disconnect}
      disconnecting={disconnecting}
      disconnectError={disconnectError}
    />
  )
}
