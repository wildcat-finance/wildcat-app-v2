import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load"
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch"
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"

const OTEL_CLIENT_INIT_KEY = "__wildcat_otel_client_initialized__"

function buildOtlpUrl(endpoint: string) {
  const trimmed = endpoint.replace(/\/$/, "")
  if (trimmed.endsWith("/api/otel")) return trimmed
  return trimmed.endsWith("/v1/traces") ? trimmed : `${trimmed}/v1/traces`
}

export function initClientOtel() {
  if (typeof window === "undefined") return

  const globalState = globalThis as unknown as Record<string, boolean>
  if (globalState[OTEL_CLIENT_INIT_KEY]) return
  globalState[OTEL_CLIENT_INIT_KEY] = true

  const serviceName =
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || "wildcat-app-v2-web"
  const resource = resourceFromAttributes({
    "service.name": serviceName,
  })

  const endpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT
  const spanProcessors = []

  if (endpoint) {
    const exporter = new OTLPTraceExporter({
      url: buildOtlpUrl(endpoint),
    })
    spanProcessors.push(new BatchSpanProcessor(exporter))
  }

  const provider = new WebTracerProvider({
    resource,
    spanProcessors,
  })

  provider.register({
    propagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
  })

  const { origin } = window.location
  const propagateUrls = origin ? [origin] : []

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        clearTimingResources: true,
        propagateTraceHeaderCorsUrls: propagateUrls,
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: propagateUrls,
      }),
    ],
  })
}
