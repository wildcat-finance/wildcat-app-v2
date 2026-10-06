import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  BaseTransaction,
  Web3TransactionReceiptObject,
} from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  minTokenAmount,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"

export type DepositRequest = {
  amount: TokenAmount
  // A maximum is an upper bound captured when the user submits.
  mode: "exact" | "maximum"
}

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk, safe } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  const waitForTransaction = async (safeTxHash: string) => {
    if (!sdk) throw Error("No sdk found")
    const { txHash } = await sdk.txs.getBySafeTxHash(safeTxHash)
    if (!txHash) throw Error("No tx hash found")
    return sdk.eth.getTransactionReceipt([txHash]).then((tx) => {
      if (tx) {
        tx.transactionHash = txHash
      }
      return tx
    })
  }

  return useMutation({
    mutationFn: async ({ amount, mode }: DepositRequest) => {
      if (!marketAccount || !signer) throw Error()
      const signingChainId = safeConnected ? safe.chainId : signer.chainId
      const signingAddress = safeConnected
        ? safe.safeAddress
        : await signer.getAddress()
      if (
        marketAccount.market.chainId !== targetChainId ||
        marketAccount.market.chainId !== signingChainId
      ) {
        throw Error(
          `Market chainId does not match active chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}, Signing ${signingChainId}`,
        )
      }
      if (
        !signingAddress ||
        signingAddress.toLowerCase() !== marketAccount.account.toLowerCase()
      ) {
        throw Error("Signing account does not match market account")
      }

      const { market } = marketAccount
      if (
        amount.token.chainId !== market.chainId ||
        amount.token.address.toLowerCase() !==
          market.underlyingToken.address.toLowerCase()
      ) {
        throw Error("Deposit asset does not match market")
      }
      // Keep the SDK's transaction-signer check when calling depositUpTo directly.
      const marketSignerAddress = await market.signer.getAddress()
      if (
        marketSignerAddress.toLowerCase() !==
        marketAccount.account.toLowerCase()
      ) {
        throw Error("Market signer does not match market account")
      }

      const tokenAmount =
        mode === "maximum"
          ? minTokenAmount(amount, marketAccount.maximumDeposit)
          : amount
      if (tokenAmount.lte(0)) throw Error("No amount available to deposit")
      const minimumDeposit = market.hooksConfig?.minimumDeposit
      if (minimumDeposit && tokenAmount.lt(minimumDeposit)) {
        throw Error("Deposit amount is below the market minimum")
      }
      const step = marketAccount.previewDeposit(tokenAmount)

      const gnosisTransactions: BaseTransaction[] = []

      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          if (
            marketAccount.underlyingApproval.gt(0) &&
            isUSDTLikeToken(marketAccount.market.underlyingToken.address)
          ) {
            gnosisTransactions.push(
              await marketAccount.populateApproveMarket(
                tokenAmount.token.getAmount(0),
              ),
            )
          }
          gnosisTransactions.push(
            await marketAccount.populateApproveMarket(tokenAmount),
          )
        } else {
          throw Error(
            `Should not be able to reach useDeposit when status not ready and not connected to safe`,
          )
        }
      }

      const deposit = async () => {
        const checkTransaction = async (
          safeTxHash: string,
        ): Promise<Web3TransactionReceiptObject> =>
          new Promise((resolve) => {
            const doCheckTransaction = async () => {
              const transactionBySafeHash =
                await sdk.txs.getBySafeTxHash(safeTxHash)
              if (transactionBySafeHash?.txHash) {
                setTxHash(transactionBySafeHash.txHash)
                const receipt = await waitForTransaction(safeTxHash)
                console.log(
                  `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
                )
                resolve(receipt)
              } else {
                setTimeout(doCheckTransaction, 1000)
              }
            }
            doCheckTransaction()
          })
        if (gnosisTransactions.length) {
          gnosisTransactions.push({
            to: marketAccount.market.address,
            data:
              mode === "maximum"
                ? market.contract.interface.encodeFunctionData("depositUpTo", [
                    tokenAmount.raw,
                  ])
                : market.contract.interface.encodeFunctionData("deposit", [
                    tokenAmount.raw,
                  ]),
            value: "0",
          })
          console.log(`Sending gnosis transactions...`)
          console.log(gnosisTransactions)
          const { safeTxHash } = await sdk.txs.send({
            txs: gnosisTransactions,
          })
          console.log(`Got gnosis transaction:\n\tsafeTxHash: ${safeTxHash}`)
          const receipt = await checkTransaction(safeTxHash)
          console.log(
            `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
          )
          return receipt
        }

        // Capacity can shrink again before execution as interest accrues.
        // depositUpTo caps on-chain while preserving the submitted upper bound.
        const tx =
          mode === "maximum"
            ? await market.contract.depositUpTo(tokenAmount.raw)
            : await marketAccount.deposit(tokenAmount)

        if (!safeConnected) setTxHash(tx.hash)

        if (safeConnected) {
          return checkTransaction(tx.hash)
        }

        return tx.wait()
      }

      await deposit()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
