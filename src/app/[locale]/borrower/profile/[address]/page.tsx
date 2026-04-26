"use client"

import * as React from "react"
import { useEffect } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { buildBorrowerProfileHref } from "@/utils/formatters"

export default function OtherBorrowerProfile({
  params: { address },
}: {
  params: { address: `0x${string}` }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const chainId = Number(searchParams.get("chainId"))
    router.replace(
      buildBorrowerProfileHref(
        address,
        Number.isInteger(chainId) && chainId > 0 ? chainId : undefined,
      ),
    )
  }, [address, router, searchParams])

  return null
}
