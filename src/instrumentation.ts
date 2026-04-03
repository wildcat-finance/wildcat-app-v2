import { registerOTel } from "@vercel/otel"

import { isOtelEnabled } from "@/lib/otel/enabled"

export function register() {
  if (!isOtelEnabled()) return

  const serviceName = process.env.OTEL_SERVICE_NAME || "wildcat-app-v2"
  const serviceNamespace = process.env.OTEL_SERVICE_NAMESPACE
  const deploymentEnvironment = process.env.OTEL_DEPLOYMENT_ENVIRONMENT

  const attributes: Record<string, string> = {}
  if (serviceNamespace) {
    attributes["service.namespace"] = serviceNamespace
  }
  if (deploymentEnvironment) {
    attributes["deployment.environment"] = deploymentEnvironment
    attributes["deployment.environment.name"] = deploymentEnvironment
  }

  registerOTel({
    serviceName,
    attributes,
  })
}
