"use client"

import TelemetryClientBootstrap from "@/components/TelemetryClientBootstrap"
import { initClientOtel } from "@/lib/otel/client"

initClientOtel()

export default function OtelClient() {
  return <TelemetryClientBootstrap />
}
