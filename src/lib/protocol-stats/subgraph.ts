import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"

export const ETHEREUM_MAINNET_SUBGRAPH_URL =
  SubgraphUrls[SupportedChainId.Mainnet]

export const PLASMA_MAINNET_SUBGRAPH_URL =
  SubgraphUrls[SupportedChainId.PlasmaMainnet]

export class SubgraphHttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
    readonly retryAfterMs: number | undefined,
    detail: string | undefined,
  ) {
    super(`Subgraph HTTP ${status} (${url})${detail ? `: ${detail}` : ""}`)
    this.name = "SubgraphHttpError"
  }
}

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

const readErrorDetail = async (res: Response): Promise<string | undefined> => {
  const text = (await res.text().catch(() => "")).trim()
  let message: unknown
  try {
    message = JSON.parse(text)?.errors?.[0]?.message
  } catch {
    message = undefined
  }
  if (typeof message === "string" && message) return message
  return text.slice(0, 200) || undefined
}

export async function querySubgraph<T>(
  url: string,
  query: string,
  {
    variables,
    signal,
    cache,
    onExtensions,
  }: {
    variables?: Record<string, unknown>
    signal?: AbortSignal
    cache?: RequestCache
    onExtensions?: (extensions: Record<string, unknown>) => void
  } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
    cache,
  })
  if (!res.ok) {
    throw new SubgraphHttpError(
      res.status,
      url,
      parseRetryAfter(res.headers.get("retry-after")),
      await readErrorDetail(res),
    )
  }
  const json = await res.json()
  if (json.extensions) onExtensions?.(json.extensions)
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Subgraph error")
  }
  return json.data as T
}
