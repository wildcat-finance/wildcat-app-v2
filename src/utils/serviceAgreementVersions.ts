const SERVICE_AGREEMENT_VERSION_LABELS: Record<string, string> = {
  "legacy-service-agreement-2023-12-18": "Legacy",
  "terms-of-use-2025-01-17-prelive-1028": "Pre-live",
  "terms-of-use-v1-2025-01-17": "Version 1",
  "terms-of-use-v2-2025-02-12": "Version 2",
}

export const formatServiceAgreementVersionLabel = (version: string): string =>
  SERVICE_AGREEMENT_VERSION_LABELS[version] ?? version
