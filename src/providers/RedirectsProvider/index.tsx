"use client"

import { useEffect } from "react"

import { useRouter } from "next/navigation"

import { GenericProviderProps } from "@/providers/interface"

import { useShouldRedirect } from "./hooks/useShouldRedirect"

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const router = useRouter()
  const { data: redirectPath, isFetching } = useShouldRedirect()

  useEffect(() => {
    if (redirectPath && !isFetching) {
      router.push(redirectPath)
    }
  }, [router, redirectPath, isFetching])

  return children
}
