"use client"

import { useEffect } from "react"

import { useRouter } from "next/navigation"

import { GenericProviderProps } from "@/providers/interface"

import { useShouldRedirect } from "./hooks/useShouldRedirect"

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const { replace } = useRouter()
  const { data: redirectPath } = useShouldRedirect()

  useEffect(() => {
    if (redirectPath) {
      replace(redirectPath)
    }
  }, [replace, redirectPath])

  return children
}
