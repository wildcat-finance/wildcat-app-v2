export const runtime = "nodejs"

export async function POST(request: Request) {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"
  const url = `${endpoint.replace(/\/$/, "")}/v1/traces`
  const body = await request.arrayBuffer()

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
      "content-length": request.headers.get("content-length") || "",
    },
    body,
  })

  return new Response(null, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  })
}
