"use client"

import * as React from "react"

import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"

export default function UserBorrowerProfile() {
  const { address: accountAddress } = useAccount()

  return <ProfilePage profileAddress={accountAddress} type="internal" />
}
