import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"

/**
 * Browser-visible subgraph endpoint for a chain.
 *
 * Literal `process.env.NEXT_PUBLIC_*` property access is required so Next.js
 * can inline the values at build time. With no override set, this returns the
 * SDK's canonical URL for the chain.
 */
export const getBrowserSubgraphUrl = (chainId: SupportedChainId): string => {
  switch (chainId) {
    case SupportedChainId.Sepolia:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA || SubgraphUrls[chainId]
      )
    case SupportedChainId.Mainnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_MAINNET || SubgraphUrls[chainId]
      )
    case SupportedChainId.PlasmaTestnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_PLASMA_TESTNET ||
        SubgraphUrls[chainId]
      )
    case SupportedChainId.PlasmaMainnet:
      return (
        process.env.NEXT_PUBLIC_SUBGRAPH_URL_PLASMA_MAINNET ||
        SubgraphUrls[chainId]
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
 * `WILDCAT_SERVER_SUBGRAPH_URL_<NET>`; falls back to the SDK's URL.
 */
export const getServerSubgraphUrl = (chainId: SupportedChainId): string => {
  const envName = SERVER_ENV[chainId]
  if (!envName) {
    throw new Error(`getServerSubgraphUrl: unknown chain ${chainId}`)
  }
  return process.env[envName] || SubgraphUrls[chainId]
}
