"use client"

import TelemetryClientBootstrap from "@/components/TelemetryClientBootstrap"
import { initClientOtel } from "@/lib/otel/client"

export default function OtelClient() {
  initClientOtel()

  return <TelemetryClientBootstrap />
}
