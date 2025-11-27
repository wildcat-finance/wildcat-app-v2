"use client"

import * as React from "react"
import { useEffect } from "react"

import { redirect } from "next/navigation"
import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"
import { ROUTES } from "@/routes"

export default function OtherBorrowerProfile({
  params: { address },
}: {
  params: { address: `0x${string}` }
}) {
  const { address: userAddress } = useAccount()

  useEffect(() => {
    if (address.toLowerCase() === userAddress?.toLowerCase()) {
      redirect(ROUTES.borrower.profile)
    }
  }, [address, userAddress])

  return <ProfilePage profileAddress={address} type="external" />
}
