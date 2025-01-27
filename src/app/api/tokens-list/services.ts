// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"

import { NETWORKS } from "@/config/network"

import { TokenInfo, TokenList } from "./interface"
import { SEPOLIA_TOKENS } from "./tokens-list/sepolia"

const TARGET_NETWORK = process.env
  .NEXT_PUBLIC_TARGET_NETWORK as keyof typeof NETWORKS

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

const fetchTokensFn = async () => {
  if (NETWORKS[TARGET_NETWORK].chainId === NETWORKS.Sepolia.chainId) {
    return SEPOLIA_TOKENS
  }

  if (!process.env.NEXT_PUBLIC_TOKENS_LIST_URL) {
    throw new Error("NEXT_PUBLIC_TOKENS_LIST_URL not provided")
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_TOKENS_LIST_URL}`)
    const tokenInfo: TokenList = await response.json()

    return tokenInfo?.tokens || []
  } catch (error) {
    // console.log(error)
  }

  return []
}

const fetchTokensFnCached = unstable_cache(fetchTokensFn, [TOKENS_LIST_KEY], {
  revalidate: REVALIDATE_TOKENS_LIST_TIMEOUT,
})

export async function fetchTokensList(searchQuery: string) {
  let tokensList: TokenInfo[] = []

  try {
    tokensList = await fetchTokensFnCached()
  } catch (error) {
    // console.log(error)
  }

  return filterByQueryType(searchQuery, tokensList)
}
