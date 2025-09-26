import { ChangeEvent, useState, useMemo } from "react"

import { TokenInfo } from "@/app/api/tokens-list/interface"
import { useGetBebopTokens } from "@/hooks/bebop/useGetBebopTokens"

export const MINIMUM_SEARCH_QUERY_LENGTH = 3

export const useBebopTokensList = () => {
  const [query, setTokenQuery] = useState("")
  const { data: bebopTokens, isLoading } = useGetBebopTokens()

  const handleChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    setTokenQuery(evt.target.value)
  }

  const handleSelect = (token: TokenInfo | null) => {
    if (token) {
      setTokenQuery(token.name)
    } else {
      setTokenQuery("")
    }
  }

  const setQuery = (newQuery: string) => {
    setTokenQuery(newQuery)
  }

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!bebopTokens) return []
    if (query.length < MINIMUM_SEARCH_QUERY_LENGTH) {
      return bebopTokens
    }

    const searchLower = query.toLowerCase()
    return bebopTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(searchLower) ||
        token.symbol.toLowerCase().includes(searchLower) ||
        token.address.toLowerCase().includes(searchLower),
    )
  }, [bebopTokens, query])

  return {
    query,
    handleChange,
    handleSelect,
    setQuery,
    tokens: filteredTokens,
    isLoading,
  }
}
