"use client"

import { useTokensList } from "./hooks/useTokensList"

export const TokenSelector = () => {
  const { handleChange, query, tokens, isLoading } = useTokensList()

  const tokenOptions = tokens.map(({ name }) => <div>{name}</div>)

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isLoading && <span>Loading</span>}
      {tokenOptions}
    </div>
  )
}
