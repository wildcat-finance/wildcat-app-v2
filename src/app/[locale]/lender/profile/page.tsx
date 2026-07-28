"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { LenderProfilePage } from "@/components/Profile/LenderProfilePage"
import { analyticsUiEnabled } from "@/config/featureFlags"
import { ROUTES } from "@/routes"

export default function UserLenderProfile() {
  const router = useRouter()
  const { address: accountAddress, isConnecting, isReconnecting } = useAccount()

  useEffect(() => {
    if (!analyticsUiEnabled) {
      router.replace(ROUTES.lender.root)
      return
    }

    if (!accountAddress && !isConnecting && !isReconnecting) {
      router.replace(ROUTES.lender.root)
    }
  }, [accountAddress, isConnecting, isReconnecting, router])

  if (!analyticsUiEnabled || !accountAddress) return null

  return <LenderProfilePage profileAddress={accountAddress} type="internal" />
}
