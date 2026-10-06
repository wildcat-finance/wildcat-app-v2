import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"

// Keep the SDK pinned to the historical fork's contract deployments while
// hosted Sepolia reads use the current graph. Fork env overrides take priority.
const DEFAULT_SUBGRAPH_URLS: Record<SupportedChainId, string> = {
  ...SubgraphUrls,
  [SupportedChainId.Sepolia]:
    "https://api.goldsky.com/api/public/project_cmheai1ym00jyx7p27qn46qtm/subgraphs/sepolia/v2.5.15/gn",
}

/**
 * Browser-visible subgraph endpoint for a chain.
 *
 * Literal `process.env.NEXT_PUBLIC_*` property access is required so Next.js
 * can inline the values at build time. With no override set, this returns the
 * app's hosted default for the chain.
 */
export const getBrowserSubgraphUrl = (chainId: SupportedChainId): string => {
  switch (chainId) {
    case SupportedChainId.Sepolia:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA ||
        DEFAULT_SUBGRAPH_URLS[chainId]
      )
    case SupportedChainId.Mainnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_MAINNET ||
        DEFAULT_SUBGRAPH_URLS[chainId]
      )
    case SupportedChainId.PlasmaTestnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_PLASMA_TESTNET ||
        DEFAULT_SUBGRAPH_URLS[chainId]
      )
    case SupportedChainId.PlasmaMainnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_PLASMA_MAINNET ||
        DEFAULT_SUBGRAPH_URLS[chainId]
      )
    default:
      throw new Error(`getBrowserSubgraphUrl: unknown chain ${chainId}`)
  }
}

const SERVER_ENV: Record<SupportedChainId, string> = {
  [SupportedChainId.Sepolia]: "WILDCAT_SERVER_SUBGRAPH_URL_SEPOLIA",
  [SupportedChainId.Mainnet]: "WILDCAT_SERVER_SUBGRAPH_URL_MAINNET",
  [SupportedChainId.PlasmaTestnet]:
    "WILDCAT_SERVER_SUBGRAPH_URL_PLASMA_TESTNET",
  [SupportedChainId.PlasmaMainnet]:
    "WILDCAT_SERVER_SUBGRAPH_URL_PLASMA_MAINNET",
}

/**
 * Server-side subgraph endpoint for a chain (API routes). Honours
 * `WILDCAT_SERVER_SUBGRAPH_URL_<NET>`; falls back to the app's hosted default.
 */
export const getServerSubgraphUrl = (chainId: SupportedChainId): string => {
  const envName = SERVER_ENV[chainId]
  if (!envName) {
    throw new Error(`getServerSubgraphUrl: unknown chain ${chainId}`)
  }
  return process.env[envName] || DEFAULT_SUBGRAPH_URLS[chainId]
}
