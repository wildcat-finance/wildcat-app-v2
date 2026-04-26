"use client"

import * as React from "react"

import { isSupportedChainId, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"

import { ProfilePage } from "@/components/Profile/ProfilePage"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

const parseChainId = (chainId: string | null) => {
  if (!chainId) return undefined
  const parsed = Number(chainId)
  return Number.isInteger(parsed) && isSupportedChainId(parsed)
    ? (parsed as SupportedChainId)
    : undefined
}

export default function PublicBorrowerProfile({
  params: { address },
}: {
  params: { address: `0x${string}` }
}) {
  const searchParams = useSearchParams()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const { address: userAddress } = useAccount()

  const chainId = parseChainId(searchParams.get("chainId")) ?? selectedChainId
  const isOwnProfile =
    !!userAddress && address.toLowerCase() === userAddress.toLowerCase()

  return (
    <ProfilePage
      profileAddress={address}
      type={isOwnProfile ? "internal" : "external"}
      chainId={chainId}
    />
  )
}
