"use client"

import * as React from "react"

import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"
import { ProfilePageSkeleton } from "@/components/Profile/ProfilePage/components/PageSkeleton"
import { useMobileResolution } from "@/hooks/useMobileResolution"

export default function UserBorrowerProfile() {
  const { address: accountAddress } = useAccount()
  const isMobile = useMobileResolution()

  // ProfilePage cannot render without an address. Hold the skeleton until the
  // wallet resolves; without one the network gate redirects away.
  if (!accountAddress)
    return <ProfilePageSkeleton isExternal={false} isMobile={isMobile} />

  return <ProfilePage profileAddress={accountAddress} type="internal" />
}
