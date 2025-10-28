// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"

import { NETWORKS, NETWORKS_BY_ID } from "@/config/network"

import { TokenInfo, TokenList } from "./interface"
import { PLASMA_TESTNET_TOKENS } from "./tokens-list/plasma-testnet"
import { SEPOLIA_TOKENS } from "./tokens-list/sepolia"

const REVALIDATE_TOKENS_LIST_TIMEOUT = 60 * 60 * 24 * 3
export const TOKENS_LIST_KEY = "tokens_list"

const filterByQueryType = (searchQuery: string, tokensList: TokenInfo[]) => {
  const lowCaseSearchQuery = searchQuery.toLowerCase()
  const isAddress = lowCaseSearchQuery.startsWith("0x")

  if (isAddress) {
    return tokensList.filter(({ address }) =>
      address.toLowerCase().startsWith(lowCaseSearchQuery),
    )
  }

  return tokensList.filter(
    ({ name, symbol }) =>
      name.toLowerCase().includes(lowCaseSearchQuery) ||
      symbol.toLowerCase().includes(lowCaseSearchQuery),
  )
}

const fetchTokensFn = async (chainId: number) => {
  if (chainId === NETWORKS.Sepolia.chainId) {
    return SEPOLIA_TOKENS
  }
  if (chainId === NETWORKS.PlasmaTestnet.chainId) {
    return PLASMA_TESTNET_TOKENS
  }

  if (!process.env.NEXT_PUBLIC_TOKENS_LIST_URL) {
    throw new Error("NEXT_PUBLIC_TOKENS_LIST_URL not provided")
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_TOKENS_LIST_URL}`)
    const tokenInfo: TokenList = await response.json()

    // For testnets, return all mainnet ETH tokens since they will be redeployed anyways
    // Otherwise, filter tokens with matching chainId
    if (NETWORKS_BY_ID[chainId as keyof typeof NETWORKS_BY_ID].isTestnet) {
      return (tokenInfo?.tokens || []).filter((token) => token.chainId === 1)
    }
    return (tokenInfo?.tokens || []).filter(
      (token) => token.chainId === chainId,
    )
  } catch (error) {
    console.log(error)
  }

  return []
}

const fetchTokensFnCached = unstable_cache(fetchTokensFn, [TOKENS_LIST_KEY], {
  revalidate: REVALIDATE_TOKENS_LIST_TIMEOUT,
})

export async function fetchTokensList(searchQuery: string, chainId: number) {
  let tokensList: TokenInfo[] = []

  try {
    tokensList = await fetchTokensFnCached(chainId)
  } catch (error) {
    console.log(error)
  }

  return filterByQueryType(searchQuery, tokensList)
}
