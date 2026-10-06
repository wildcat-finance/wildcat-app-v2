export const ETHEREUM_MAINNET_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmheai1ym00jyx7p27qn46qtm/subgraphs/mainnet/v2.0.30/gn"

export const PLASMA_MAINNET_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmheai1ym00jyx7p27qn46qtm/subgraphs/plasma-mainnet/v2.0.30/gn"

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
