import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getBrowserSubgraphUrl } from "@/lib/subgraph/endpoints"

// Protocol stats are fetched from the browser (Header TVL, trending prices),
// so these honour the NEXT_PUBLIC_SUBGRAPH_URL_* overrides and otherwise
// resolve to the SDK's canonical Goldsky URLs.
export const ETHEREUM_MAINNET_SUBGRAPH_URL = getBrowserSubgraphUrl(
  SupportedChainId.Mainnet,
)

export const PLASMA_MAINNET_SUBGRAPH_URL = getBrowserSubgraphUrl(
  SupportedChainId.PlasmaMainnet,
)

export async function querySubgraph<T>(url: string, query: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status} (${url})`)
  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Subgraph error")
  }
  return json.data as T
}
