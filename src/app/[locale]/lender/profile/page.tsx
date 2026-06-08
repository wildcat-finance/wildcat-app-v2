"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { LenderProfilePage } from "@/components/Profile/LenderProfilePage"
import { ROUTES } from "@/routes"

export default function UserLenderProfile() {
  const router = useRouter()
  const { address: accountAddress, isConnecting, isReconnecting } = useAccount()

  useEffect(() => {
    if (!accountAddress && !isConnecting && !isReconnecting) {
      router.replace(ROUTES.lender.root)
    }
  }, [accountAddress, isConnecting, isReconnecting, router])

  if (!accountAddress) return null

  return <LenderProfilePage profileAddress={accountAddress} type="internal" />
}
