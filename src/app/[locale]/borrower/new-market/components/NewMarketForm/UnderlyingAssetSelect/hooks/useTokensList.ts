import { ChangeEvent, useEffect, useState } from "react"

import { useDebounce } from "react-use"

import { useGetTokensList } from "./useGetTokensList"

export const MINIMUM_SEARCH_QUERY_LENGTH = 3

export const useTokensList = () => {
  const [query, setTokenQuery] = useState("")
  const { refetch, data: tokens, ...queryData } = useGetTokensList(query)

  const handleChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    setTokenQuery(evt.target.value)
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

  useEffect(() => {
    if (query.length >= MINIMUM_SEARCH_QUERY_LENGTH) {
      refetch()
    }
  }, [query, refetch])

  return {
    query,
    handleChange,
    tokens: tokens || [],
    ...queryData,
  }
}
