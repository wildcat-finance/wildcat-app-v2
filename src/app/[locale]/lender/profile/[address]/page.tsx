"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { ROUTES } from "@/routes"

export default function LenderProfileAddressRedirect() {
  const router = useRouter()
  const { isConnected, isConnecting, isReconnecting } = useAccount()

  useEffect(() => {
    if (isConnected) {
      router.replace(ROUTES.lender.profile)
      return
    }

    if (!isConnecting && !isReconnecting) {
      router.replace(ROUTES.lender.root)
    }
  }, [isConnected, isConnecting, isReconnecting, router])

  return null
}
