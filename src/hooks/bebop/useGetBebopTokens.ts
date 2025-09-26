import { useCallback } from "react"

import { useQuery } from "@tanstack/react-query"
import { SignerOrProvider, Token } from "@wildcatfi/wildcat-sdk"

import { NETWORKS } from "@/config/network"

import { useEthersProvider } from "../useEthersSigner"

export interface BebopTokenResponse {
  name: string
  ticker: string
  availability: {
    isAvailable: boolean
    canBuy: boolean
    canSell: boolean
  }
  priceUsd: number
  cid: string
  displayDecimals: number
  colour: string
  tags: string[]
  iconUrl: string
  chainInfo: {
    chainId: number
    contractAddress: string
    decimals: number
  }[]
}

export type TokenWithMetadata = Token & {
  logoURI?: string
  priceUsd?: number
}

export interface BebopTokensApiResponse {
  tokens: { [key: string]: BebopTokenResponse }
  metadata: { lastUpdate: string }
}

/**
 * @description Fetches ALL TOKENS available on Bebop.
 * DOES NOT return only tokens available on the PMM.
 */
export async function fetchBebopTokens(
  provider: SignerOrProvider,
  chainId: number,
  onlyCanSell?: boolean,
): Promise<TokenWithMetadata[]> {
  const result = await fetch(
    "https://api.bebop.xyz/pmm/ethereum/v3/tokens?active_only=true",
  )
  const data = (await result.json()) as BebopTokensApiResponse
  const tokens = Object.values(data.tokens)
    .map((token) =>
      token.chainInfo.map((chainInfo) => ({
        ...token,
        chainId: chainInfo.chainId,
        address: chainInfo.contractAddress,
        decimals: chainInfo.decimals,
      })),
    )
    .flat()

  const outTokens = tokens
    .filter(
      (token) =>
        token.chainId === chainId &&
        (!onlyCanSell || token.availability.canSell) &&
        token.address !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    )
    .map((token) =>
      Object.assign(
        new Token(
          chainId,
          token.address.toLowerCase(),
          token.name,
          token.ticker,
          token.decimals,
          false,
          provider,
        ),
        {
          logoURI: token.iconUrl,
          priceUsd: token.priceUsd,
        },
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log(
    `BEBOP PMM: Found ${outTokens.length} tokens | Filter removed ${
      tokens.length - outTokens.length
    }`,
  )
  return outTokens
}

export const GET_BEBOP_TOKENS_KEY = "get-bebop-tokens"

export function useGetBebopTokens(onlyCanSell?: boolean) {
  const { provider, chain } = useEthersProvider()
  const getTokens = useCallback(() => {
    if (!provider || !chain) {
      throw new Error("Provider or chain not found")
    }
    return fetchBebopTokens(
      provider,
      chain.id === NETWORKS.Sepolia.chainId ? 1 : chain.id,
      onlyCanSell,
    )
  }, [provider, chain, onlyCanSell])
  return useQuery({
    queryKey: [GET_BEBOP_TOKENS_KEY, chain?.id, onlyCanSell],
    queryFn: getTokens,
    enabled: !!provider && !!chain,
  })
}
