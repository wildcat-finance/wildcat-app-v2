import {
  getDeploymentAddress,
  hasDeploymentAddress,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import {
  type Address,
  type Hex,
  isAddressEqual,
  parseAbi,
  zeroAddress,
} from "viem"

import { getPublicClientForServer } from "@/lib/provider"

import { MORPHO_BLUE_ADDRESS, UPSTREAM_TIMEOUT_MS } from "../constants"

const ARCH_CONTROLLER_ABI = parseAbi([
  "function getRegisteredMarkets() view returns (address[])",
])

const WRAPPER_FACTORY_ABI = parseAbi([
  "function wrapperForMarket(address market) view returns (address)",
])

const MARKET_ABI = parseAbi([
  "function asset() view returns (address)",
  "function borrower() view returns (address)",
])

const MORPHO_BLUE_ABI = parseAbi([
  "function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)",
])

const getClient = (chainId: SupportedChainId) =>
  getPublicClientForServer(chainId, {
    timeout: UPSTREAM_TIMEOUT_MS,
    retryCount: 1,
  })

export type WrappedMarket = {
  market: Address
  wrapper: Address
  asset: Address
  borrower: Address
}

export const getWrappedMarkets = async (
  chainId: SupportedChainId,
): Promise<WrappedMarket[]> => {
  if (!hasDeploymentAddress(chainId, "Wildcat4626WrapperFactory")) return []

  const client = getClient(chainId)
  const archController = getDeploymentAddress(
    chainId,
    "WildcatArchController",
  ) as Address
  const wrapperFactory = getDeploymentAddress(
    chainId,
    "Wildcat4626WrapperFactory",
  ) as Address

  const markets = await client.readContract({
    address: archController,
    abi: ARCH_CONTROLLER_ABI,
    functionName: "getRegisteredMarkets",
  })
  if (markets.length === 0) return []

  const wrappers = await client.multicall({
    allowFailure: false,
    contracts: markets.map((market) => ({
      address: wrapperFactory,
      abi: WRAPPER_FACTORY_ABI,
      functionName: "wrapperForMarket" as const,
      args: [market] as const,
    })),
  })

  const wrapped = markets.flatMap((market, index) =>
    isAddressEqual(wrappers[index], zeroAddress)
      ? []
      : [{ market, wrapper: wrappers[index] }],
  )
  if (wrapped.length === 0) return []

  const details = (await client.multicall({
    allowFailure: false,
    contracts: wrapped.flatMap(({ market }) => [
      {
        address: market,
        abi: MARKET_ABI,
        functionName: "asset" as const,
      },
      {
        address: market,
        abi: MARKET_ABI,
        functionName: "borrower" as const,
      },
    ]),
  })) as Address[]

  return wrapped.map(({ market, wrapper }, index) => ({
    market,
    wrapper,
    asset: details[index * 2],
    borrower: details[index * 2 + 1],
  }))
}

export type MorphoMarketParams = {
  loanToken: Address
  collateralToken: Address
  lltv: bigint
}

export const getMorphoMarketParams = async (
  chainId: SupportedChainId,
  marketIds: Hex[],
): Promise<Map<string, MorphoMarketParams>> => {
  const morpho = MORPHO_BLUE_ADDRESS[chainId]
  const params = new Map<string, MorphoMarketParams>()
  if (!morpho || marketIds.length === 0) return params

  const results = await getClient(chainId).multicall({
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
