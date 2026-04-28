"use client"

import { useEffect } from "react"

import TelemetryClientBootstrap from "@/components/TelemetryClientBootstrap"

export default function OtelClient() {
  useEffect(() => {
    let isMounted = true

    async function loadClientOtel() {
      const { initClientOtel } = await import("@/lib/otel/client")
      if (isMounted) initClientOtel()
    }

    loadClientOtel()

    return () => {
      isMounted = false
    }
  }, [])

  return <TelemetryClientBootstrap />
}
