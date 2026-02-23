import { useMutation } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useAccount, useWalletClient } from "wagmi"

import { toastSuccess } from "@/components/Toasts"
import { COLORS } from "@/theme/colors"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

const TOAST_STYLE = {
  borderRadius: "24px",
  background: COLORS.blackRock,
  color: COLORS.white,
  fontFamily: "Roboto, sans-serif",
}

const isMobileDevice = (): boolean =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(navigator.userAgent)

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()

  const canAddToken =
    !!token &&
    (isMobileDevice() || (!!walletClient && connector?.type === "injected"))

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token provided")

      const { address, symbol, decimals, name } = token

      if (isMobileDevice()) {
        await navigator.clipboard?.writeText(address).catch(() => {})
        toastSuccess(
          `Token address copied! Open your wallet and paste address to add ${symbol}.`,
        )
        return
      }

      if (!walletClient) throw new Error("No wallet client")

      await toast.promise(
        walletClient.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: { address, symbol, decimals, name },
          },
        }),
        {
          loading: `Adding ${symbol} to wallet...`,
          success: `${symbol} added to wallet`,
          error: "Failed to add token",
        },
        { style: TOAST_STYLE },
      )
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}
