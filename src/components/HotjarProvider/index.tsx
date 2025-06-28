"use client"

import { useEffect, useRef } from "react"

import Hotjar from "@hotjar/browser"
import { usePathname } from "next/navigation"

const HOTJAR_ID = Number(process.env.NEXT_PUBLIC_HOTJAR_ID)
const HOTJAR_VERSION = Number(process.env.NEXT_PUBLIC_HOTJAR_VERSION ?? 6)

export function HotjarProvider() {
  const pathname = usePathname()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      Hotjar.init(HOTJAR_ID, HOTJAR_VERSION)
      initialized.current = true
    }
    Hotjar.stateChange(pathname)
  }, [pathname])

  return null
}
