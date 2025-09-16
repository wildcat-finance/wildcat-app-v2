import { useQuery } from "@tanstack/react-query"
import { Signer, Token } from "@wildcatfi/wildcat-sdk"
import { isAddress } from "viem"

import { TokenInfo } from "@/app/api/tokens-list/interface"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"

export const TOKEN_LIST_SEARCH_KEY = "tokens-list-search"

const fetchTokensList = async (
  query: string,
  signer: Signer,
  chainId: number,
) => {
  const tokensList: TokenInfo[] = await fetch(
    `/api/tokens-list?search=${query}`,
  ).then((res) => res.json())

  // Try to fetch token info by address
  if (!tokensList?.length && isAddress(query)) {
    try {
      const tokenInfo = await Token.getTokenData(
        chainId,
        query,
        signer as Signer,
      )

      return [tokenInfo]
    } catch {
      throw Error("Token address is not valid")
    }
  }

  return tokensList
}

export const useGetTokensList = (query: string) => {
  const signer = useEthersSigner()
  const { chainId } = useCurrentNetwork()

  return useQuery({
    queryKey: [TOKEN_LIST_SEARCH_KEY, query],
    enabled: false,
    queryFn: () => fetchTokensList(query, signer as Signer, chainId as number),
  })
}
