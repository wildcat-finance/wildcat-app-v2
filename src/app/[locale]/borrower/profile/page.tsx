"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"
import { ROUTES } from "@/routes"

export default function UserBorrowerProfile() {
  const router = useRouter()
  const {
    address: accountAddress,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useAccount()

  useEffect(() => {
    if (!accountAddress && !isConnected && !isConnecting && !isReconnecting) {
      router.replace(ROUTES.lender.root)
    }
  }, [accountAddress, isConnected, isConnecting, isReconnecting, router])

  return <ProfilePage profileAddress={accountAddress} type="internal" />
}
