"use client"

import { useEffect, useState } from "react"

import { useAccount } from "wagmi"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useWagmiHydrated } from "@/hooks/useWagmiHydrated"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLenderKycDialogOpen } from "@/store/slices/lenderKycDialogSlice/lenderKycDialogSlice"

import { LenderKycDialog } from "../LenderKycDialog"

/// The one verification dialog, opened from the lender card, the sidebar
/// footer and the mobile menu.
export const LenderKycDialogHost = () => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((state) => state.lenderKycDialog.open)
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const isWalletHydrated = useWagmiHydrated()
  const { chainId } = useSelectedNetwork()
  const [isMounted, setIsMounted] = useState(false)

  const isWalletAvailable =
    isWalletHydrated &&
    !isConnecting &&
    !isReconnecting &&
    isConnected &&
    !!address

  useEffect(() => {
    if (open && isWalletAvailable) setIsMounted(true)
  }, [open, isWalletAvailable])

  useEffect(() => {
    if (isWalletAvailable) return
    dispatch(setLenderKycDialogOpen(false))
    setIsMounted(false)
  }, [isWalletAvailable, dispatch])

  if (!isMounted || !address) return null

  return (
    <LenderKycDialog
      open={open}
      address={address}
      chainId={chainId}
      onClose={() => dispatch(setLenderKycDialogOpen(false))}
      onExited={() => setIsMounted(false)}
    />
  )
}
