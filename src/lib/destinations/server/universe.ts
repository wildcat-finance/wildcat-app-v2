import {
  getDeploymentAddress,
  hasDeploymentAddress,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { type Address, isAddressEqual, parseAbi, zeroAddress } from "viem"

import { getDestinationsClient } from "./rpc"
import type { DestinationTokenForm } from "../types"

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

/** A Wildcat market and the tokens of it that platforms can take. */
export type WildcatToken = {
  market: Address
  asset: Address
  borrower: Address
  wrapper: Address
}

export const tokenAddressOf: Record<
  DestinationTokenForm,
  (token: WildcatToken) => Address
> = {
  wrapper: (token) => token.wrapper,
}

/** Registered markets that have a Wildcat 4626 wrapper, read on-chain. */
export const getWildcatTokens = async (
  chainId: SupportedChainId,
): Promise<WildcatToken[]> => {
  if (!hasDeploymentAddress(chainId, "Wildcat4626WrapperFactory")) return []

  const client = getDestinationsClient(chainId)
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
