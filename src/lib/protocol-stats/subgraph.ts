import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"

export const ETHEREUM_MAINNET_SUBGRAPH_URL =
  SubgraphUrls[SupportedChainId.Mainnet]

export const PLASMA_MAINNET_SUBGRAPH_URL =
  SubgraphUrls[SupportedChainId.PlasmaMainnet]

export async function querySubgraph<T>(
  url: string,
  query: string,
  {
    variables,
    signal,
    cache,
  }: {
    variables?: Record<string, unknown>
    signal?: AbortSignal
    cache?: RequestCache
  } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
    cache,
  })
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status} (${url})`)
  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Subgraph error")
  }
  return json.data as T
}
