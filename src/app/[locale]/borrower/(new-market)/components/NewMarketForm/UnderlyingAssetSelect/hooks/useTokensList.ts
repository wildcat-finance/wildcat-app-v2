import { ChangeEvent, useState } from "react"

import { useDebounce } from "react-use"

import { TokenInfo } from "@/app/api/tokens-list/interface"

import { useGetTokensList } from "./useGetTokensList"

export const MINIMUM_SEARCH_QUERY_LENGTH = 3

export const useTokensList = () => {
  const [query, setTokenQuery] = useState("")
  const { refetch, data: tokens, ...queryData } = useGetTokensList(query)

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

  useDebounce(
    () => {
      if (query.length >= MINIMUM_SEARCH_QUERY_LENGTH) {
        refetch()
      }
    },
    300,
    [query],
  )

  return {
    query,
    handleChange,
    handleSelect,
    setQuery,
    tokens: tokens || [],
    ...queryData,
  }
}
