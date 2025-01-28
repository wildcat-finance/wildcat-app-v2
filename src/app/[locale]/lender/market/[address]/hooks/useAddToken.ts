import { useEffect, useState } from "react"

import { useMutation } from "@tanstack/react-query"
import { useAccount } from "wagmi"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

type EthereumClient = {
  request(args: {
    method: "wallet_watchAsset"
    params: {
      type: "ERC20"
      options: NewToken
    }
  }): Promise<void>
}

export function useAddToken(token: NewToken | undefined) {
  const { address } = useAccount()
  const [ethereumClient, setEthereumClient] = useState<
    EthereumClient | undefined
  >()

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const checkWindowValue = () => {
      if (address && "ethereum" in window) {
        setEthereumClient(window.ethereum as EthereumClient)
        clearInterval(intervalId)
      }
    }

    intervalId = setInterval(checkWindowValue, 1000) // Check every second

    // Cleanup function to clear the interval when the hook is unmounted
    return () => {
      clearInterval(intervalId)
    }
  }, []) // Remove ethereumClient dependency to prevent re-running of the effect

  const canAddToken = !!ethereumClient

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!ethereumClient) {
        throw Error("No ethereum client found")
      }
      if (!token) {
        throw Error("No token found")
      }
      console.log(`Adding token...`)
      const { address: tokenAddress, name, symbol, decimals } = token
      const result = await ethereumClient.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol,
            decimals,
            name,
          },
        },
      })

      return result
    },
    onError(e) {
      console.log(e)
    },
    onSuccess(result) {
      console.log(`Added token!`)
      console.log(result)
    },
  })

  return {
    canAddToken,
    handleAddToken,
    isAddingToken,
  }
}
