export const isOtelEnabled = () =>
  process.env.OTEL_ENABLED?.trim().toLowerCase() === "true"
