import { useQuery } from "@tanstack/react-query"
import { Signer, Token } from "@wildcatfi/wildcat-sdk"
import { isAddress } from "viem"

import { TokenInfo } from "@/app/api/tokens-list/interface"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import {
  JsonRpcSignerWithChainId,
  useEthersSigner,
} from "@/hooks/useEthersSigner"

const fetchTokensList = async (
  query: string,
  signer: JsonRpcSignerWithChainId,
  targetChainId: number,
) => {
  if (signer.chainId !== targetChainId) {
    throw Error("Signer chainId does not match targetChainId")
  }
  const tokensList: TokenInfo[] = await fetch(
    `/api/tokens-list?search=${query}&chainId=${targetChainId}`,
  ).then((res) => res.json())

  // Try to fetch token info by address
  if (!tokensList?.length && isAddress(query)) {
    try {
      const tokenInfo = await Token.getTokenData(
        targetChainId,
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
  const { targetChainId } = useCurrentNetwork()

  return useQuery({
    queryKey: QueryKeys.Token.TOKEN_LIST_SEARCH(targetChainId, query),
    enabled: false,
    queryFn: () =>
      fetchTokensList(query, signer as JsonRpcSignerWithChainId, targetChainId),
  })
}
