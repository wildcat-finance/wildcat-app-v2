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
  value: (tx.value ?? 0n).toString(),
})
