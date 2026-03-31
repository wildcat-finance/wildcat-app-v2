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

import {
  isClientOtelInitialized,
  markClientOtelInitialized,
} from "@/lib/otel/state"

function buildOtlpUrl(endpoint: string) {
  const trimmed = endpoint.replace(/\/$/, "")
  if (trimmed.endsWith("/api/otel")) return trimmed
  if (trimmed.endsWith("/v1/traces")) return trimmed
  return `${trimmed}/v1/traces`
}

export function initClientOtel() {
  if (typeof window === "undefined") return

  if (isClientOtelInitialized()) return
  markClientOtelInitialized()

  const serviceName =
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || "wildcat-app-v2-web"
  const serviceNamespace = process.env.NEXT_PUBLIC_OTEL_SERVICE_NAMESPACE
  const deploymentEnvironment =
    process.env.NEXT_PUBLIC_OTEL_DEPLOYMENT_ENVIRONMENT

  const resourceAttributes: Record<string, string> = {
    "service.name": serviceName,
  }
  if (serviceNamespace) {
    resourceAttributes["service.namespace"] = serviceNamespace
  }
  if (deploymentEnvironment) {
    resourceAttributes["deployment.environment"] = deploymentEnvironment
    resourceAttributes["deployment.environment.name"] = deploymentEnvironment
  }

  const resource = resourceFromAttributes(resourceAttributes)

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
  const ignoreUrls = [/\/api\/otel$/, /\/api\/bug-report$/]

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        clearTimingResources: true,
        ignoreUrls,
        propagateTraceHeaderCorsUrls: propagateUrls,
      }),
      new XMLHttpRequestInstrumentation({
        ignoreUrls,
        propagateTraceHeaderCorsUrls: propagateUrls,
      }),
    ],
  })
}
