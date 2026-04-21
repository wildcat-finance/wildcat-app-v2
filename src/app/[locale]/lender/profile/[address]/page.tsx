"use client"

import * as React from "react"
import { useEffect } from "react"

import { redirect } from "next/navigation"
import { useAccount } from "wagmi"

import { LenderProfilePage } from "@/components/Profile/LenderProfilePage"
import { ROUTES } from "@/routes"

export default function OtherBorrowerProfile({
  params: { address },
}: {
  params: { address: `0x${string}` }
}) {
  const { address: userAddress } = useAccount()

  useEffect(() => {
    if (address.toLowerCase() === userAddress?.toLowerCase()) {
      redirect(ROUTES.lender.profile)
    }
  }, [address, userAddress])

  return <LenderProfilePage profileAddress={address} type="external" />
}
