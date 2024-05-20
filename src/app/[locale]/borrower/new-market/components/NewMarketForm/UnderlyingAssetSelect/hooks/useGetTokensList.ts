import { useQuery } from "@tanstack/react-query"

import { TokenInfo } from "@/app/api/tokens-list/interface"

export const TOKEN_LIST_SEARCH_KEY = "tokens-list-search"

const fetchTokensList = async (query: string) => {
  const tokensList: TokenInfo[] = await fetch(
    `/api/tokens-list?search=${query}`,
  ).then((res) => res.json())

  return tokensList
}

export const useGetTokensList = (query: string) =>
  useQuery({
    queryKey: [TOKEN_LIST_SEARCH_KEY, query],
    enabled: false,
    queryFn: () => fetchTokensList(query),
  })
