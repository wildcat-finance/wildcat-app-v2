"use client"

import { useEffect } from "react"

import { usePathname } from "next/navigation"

export default function HotjarRouteTracker(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined" && window.hj) {
      window.hj("stateChange", pathname)
    }
  }, [pathname])

  return null
}
