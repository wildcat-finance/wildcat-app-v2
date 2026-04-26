"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { buildBorrowerProfileHref } from "@/utils/formatters"

export default function UserBorrowerProfile() {
  const router = useRouter()
  const {
    address: accountAddress,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useAccount()
  const { chainId } = useSelectedNetwork()

  useEffect(() => {
    if (accountAddress) {
      router.replace(buildBorrowerProfileHref(accountAddress, chainId))
      return
    }

    if (!isConnected && !isConnecting && !isReconnecting) {
      router.replace(ROUTES.lender.root)
    }
  }, [
    accountAddress,
    chainId,
    isConnected,
    isConnecting,
    isReconnecting,
    router,
  ])

  return null
}
