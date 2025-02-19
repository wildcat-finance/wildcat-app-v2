"use client"

import * as React from "react"
import { useEffect } from "react"

import { redirect } from "next/navigation"
import { useAccount } from "wagmi"

import { ContentContainer } from "@/app/[locale]/borrower/profile/style"
import { ROUTES } from "@/routes"

import { BorrowerProfileDetails } from "../components/BorrowerProfileDetails"

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

  return <BorrowerProfileDetails address={address} sx={ContentContainer} />
}
