import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  iPeriodicTermHooksAbi,
  MarketAccount,
  prepareTransaction,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import {
  toEthersTransactionRequest,
  waitForSubmittedTransaction,
} from "@/utils/transactions"

export type AdjustAprMode = "set" | "propose"

export type AdjustAprInput =
  | number
  | {
      apr: number
      mode?: AdjustAprMode
    }

const normalizeAdjustAprInput = (input: AdjustAprInput) =>
  typeof input === "number"
    ? { apr: input, mode: "set" as const }
    : { apr: input.apr, mode: input.mode ?? "set" }

export const useAdjustAPR = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const { signer, address, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (input: AdjustAprInput) => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const submitAprChange = async () => {
        const { apr, mode } = normalizeAdjustAprInput(input)
        const aprBips = Math.round(apr * 100)
        const proposeAnnualInterestBips = async () => {
          const hooksAddress =
            marketAccount.market.periodicHooksConfig?.hooksAddress
          if (!hooksAddress) {
            throw Error("Market does not have periodic term hooks")
          }

          const tx = prepareTransaction({
            to: hooksAddress,
            abi: iPeriodicTermHooksAbi,
            functionName: "proposeAnnualInterestBips",
            args: [aprBips],
          })
          const { hash } = await signer.sendTransaction(
            toEthersTransactionRequest(tx),
          )
          return hash
        }
        const hash =
          mode === "propose"
            ? await proposeAnnualInterestBips()
            : await marketAccount.setAnnualInterestBips(aprBips)

        if (!safeConnected) setTxHash(hash.toString())

        const { hash: transactionHash, receipt } =
          await waitForSubmittedTransaction({
            provider: signer.provider,
            hash,
            safeConnected,
            safeSdk: sdk,
          })
        setTxHash(transactionHash)
        return receipt
      }

      await submitAprChange()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          address,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
