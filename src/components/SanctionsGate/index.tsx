"use client"

import {
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

import toast from "react-hot-toast"
import { useAccount, useDisconnect } from "wagmi"
import { getAccount } from "wagmi/actions"

import { useSanctionsStatus } from "@/hooks/useSanctionsStatus"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { config } from "@/lib/config"
import {
  suppressAutoConnect,
  WalletStartupContext,
} from "@/providers/WagmiQueryProviders"
import { useAppStore } from "@/store/hooks"
import { SanctionsDevOverride } from "@/utils/sanctions"
import {
  clearSanctionsAccess,
  setSanctionsAccess,
} from "@/utils/sanctionsAccess"

import { SanctionsScreen } from "./Screen"

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

export function SanctionsGate({
  children,
  devOverride,
}: {
  children: ReactNode
  devOverride?: SanctionsDevOverride
}) {
  const { address, chainId, status: walletStatus } = useAccount()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const startupReady = useContext(WalletStartupContext)
  const store = useAppStore()
  const [mounted, setMounted] = useState(false)
  const [disconnectError, setDisconnectError] = useState(false)
  const { disconnectAsync, isPending: disconnecting } = useDisconnect()
  const ready =
    mounted &&
    startupReady &&
    walletStatus !== "connecting" &&
    walletStatus !== "reconnecting"
  const screening = useSanctionsStatus({
    address,
    chainId,
    selectedChainId,
    enabled: ready && walletStatus === "connected",
    devOverride,
  })
  const open =
    ready && (walletStatus === "disconnected" || screening.status === "clear")

  useEffect(() => setMounted(true), [])
  useBrowserLayoutEffect(() => {
    setSanctionsAccess(
      {
        address: address?.toLowerCase(),
        chainId,
        selectedChainId,
        status: ready ? screening.status : "checking",
        validUntil: screening.validUntil,
      },
      () => {
        const account = getAccount(config)
        return {
          address: account.status === "connected" ? account.address : undefined,
          chainId: account.chainId,
          selectedChainId: store.getState().selectedNetwork.chainId,
        }
      },
    )
    if (!open) toast.remove()
    return clearSanctionsAccess
  }, [
    address,
    chainId,
    selectedChainId,
    ready,
    screening.status,
    screening.validUntil,
    open,
    store,
  ])

  const disconnect = async () => {
    suppressAutoConnect()
    clearSanctionsAccess()
    setDisconnectError(false)
    try {
      await disconnectAsync()
    } catch {
      setDisconnectError(true)
    }
  }

  if (open) return children
  const displayStatus =
    !ready || screening.status === "clear" ? "checking" : screening.status
  return (
    <SanctionsScreen
      status={displayStatus}
      address={address}
      onDisconnect={disconnect}
      onRetry={screening.retry}
      retrying={screening.isRefreshing}
      disconnecting={disconnecting}
      disconnectError={disconnectError}
    />
  )
}
