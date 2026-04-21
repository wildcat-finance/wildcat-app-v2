"use client"

import * as React from "react"

import { useAccount } from "wagmi"

import { LenderProfilePage } from "@/components/Profile/LenderProfilePage"

export default function UserBorrowerProfile() {
  const { address: accountAddress } = useAccount()

  return <LenderProfilePage profileAddress={accountAddress} type="internal" />
}
