import type { Provider, TransactionReceipt } from "@ethersproject/providers"
import {
  PartialTransaction,
  SafeTransactionInput,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"

export const toSafeTransactions = (
  txs: PartialTransaction[],
): SafeTransactionInput[] => txs.map(toSafeTransactionInput)

export const toEthersTransactionRequest = (tx: PartialTransaction) => ({
  to: tx.to,
  data: tx.data,
  value: (tx.value ?? BigInt(0)).toString(),
})

type SafeSdkLike = {
  txs: {
    getBySafeTxHash: (
      safeTxHash: string,
    ) => Promise<{ txHash?: string | null } | null | undefined>
  }
}

export const waitForSafeTransactionHash = async (
  sdk: SafeSdkLike,
  safeTxHash: string,
): Promise<string> =>
  new Promise((resolve) => {
    const check = async () => {
      const transactionBySafeHash = await sdk.txs.getBySafeTxHash(safeTxHash)
      if (transactionBySafeHash?.txHash) {
        resolve(transactionBySafeHash.txHash)
      } else {
        setTimeout(check, 1000)
      }
    }
    check()
  })

export const waitForSubmittedTransaction = async ({
  provider,
  hash,
  safeConnected,
  safeSdk,
}: {
  provider: Provider | undefined
  hash: string
  safeConnected?: boolean
  safeSdk?: SafeSdkLike
}): Promise<{ hash: string; receipt: TransactionReceipt }> => {
  if (!provider) {
    throw Error("No provider available to wait for transaction")
  }
  if (safeConnected && !safeSdk) {
    throw Error("No Safe SDK")
  }
  const transactionHash =
    safeConnected && safeSdk
      ? await waitForSafeTransactionHash(safeSdk, hash)
      : hash
  const receipt = await provider.waitForTransaction(transactionHash)
  return { hash: transactionHash, receipt }
}
