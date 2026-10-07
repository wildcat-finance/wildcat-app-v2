import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { type Address, type Hex, parseAbi } from "viem"

import { getDestinationsClient } from "../../rpc"

const MORPHO_BLUE_ABI = parseAbi([
  "function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)",
])

export type MorphoMarketParams = {
  loanToken: Address
  collateralToken: Address
  lltv: bigint
}

export const getMorphoMarketParams = async (
  chainId: SupportedChainId,
  morpho: Address,
  marketIds: Hex[],
): Promise<Map<string, MorphoMarketParams>> => {
  const params = new Map<string, MorphoMarketParams>()
  if (marketIds.length === 0) return params

  const results = await getDestinationsClient(chainId).multicall({
    allowFailure: false,
    contracts: marketIds.map((id) => ({
      address: morpho,
      abi: MORPHO_BLUE_ABI,
      functionName: "idToMarketParams" as const,
      args: [id] as const,
    })),
  })

  marketIds.forEach((id, index) => {
    const [loanToken, collateralToken, , , lltv] = results[index]
    params.set(id.toLowerCase(), { loanToken, collateralToken, lltv })
  })

  return params
}
