import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

const alchemy = (net: "sepolia" | "mainnet") =>
  `https://eth-${net}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`

/**
 * Browser RPC URL per chain: NEXT_PUBLIC_RPC_URL_<NET> override, else the production default.
 * Each env var is written out literally so Next.js can inline it at build time.
 */
export const getBrowserRpcUrl = (chainId: number): string => {
  switch (chainId) {
    case SupportedChainId.Sepolia:
      return process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA || alchemy("sepolia")
    case SupportedChainId.Mainnet:
      return process.env.NEXT_PUBLIC_RPC_URL_MAINNET || alchemy("mainnet")
    case SupportedChainId.PlasmaTestnet:
      return (
        process.env.NEXT_PUBLIC_RPC_URL_PLASMA_TESTNET ||
        "https://testnet-rpc.plasma.to"
      )
    case SupportedChainId.PlasmaMainnet:
      return (
        process.env.NEXT_PUBLIC_RPC_URL_PLASMA_MAINNET ||
        "https://rpc.plasma.to"
      )
    default:
      throw new Error(`getBrowserRpcUrl: unknown chain ${chainId}`)
  }
}
