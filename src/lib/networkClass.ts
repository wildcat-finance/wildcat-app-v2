import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { NETWORKS_BY_ID } from "@/config/network"

/// The network class of a chain. Borrower records and MLA templates are shared
/// by every network of one class and never cross between mainnet and testnet.
export const isTestnetChain = (chainId: SupportedChainId): boolean =>
  NETWORKS_BY_ID[chainId].isTestnet
