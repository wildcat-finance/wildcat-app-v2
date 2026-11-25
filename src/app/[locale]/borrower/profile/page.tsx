"use client"

import * as React from "react"

import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"
import { ProfilePageSkeleton } from "@/components/Profile/ProfilePage/components/PageSkeleton"
import { useMobileResolution } from "@/hooks/useMobileResolution"

export default function UserBorrowerProfile() {
  const { address: accountAddress } = useAccount()
  const isMobile = useMobileResolution()

  if (!accountAddress)
    return <ProfilePageSkeleton isExternal={false} isMobile={isMobile} />

  return <ProfilePage profileAddress={accountAddress} type="internal" />
}
