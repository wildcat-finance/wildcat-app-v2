import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type TransactionReceipt,
} from "viem"
import { sepolia } from "viem/chains"

import { erc20Abi, marketAbi } from "./abis"
import { FORK_RPC, type Address } from "./env"
import * as journal from "./journal"

/** Minimal ABIs for the flows under test — centralized in ./abis (shared with the report decoder). */
export { erc20Abi, marketAbi }

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(FORK_RPC),
})
/** Wallet client for an anvil-owned account: anvil signs, nothing is signed here. */
export const walletFor = (account: Address) =>
  createWalletClient({ account, chain: sepolia, transport: http(FORK_RPC) })

/** Fixed generous gas: estimation runs against the pre-time-travel block and understates post-jump work. */
const GAS = 5_000_000n

journal.setChainStateProvider(async () => {
  const block = await publicClient.getBlock()
  return {
    chainBlock: block.number.toString(),
    chainTimestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
  }
})

/** Semantic call context threaded into the journal alongside the receipt. */
export type TxMeta = { functionName?: string; args?: readonly unknown[] }

/** Journal a mined receipt with its semantic context (who called what, with which args).
 *  from/to come from the receipt itself; bigint args are stringified at attach time. */
export const recordTx = (receipt: TransactionReceipt, meta?: TxMeta) =>
  journal.record({
    kind: "tx",
    hash: receipt.transactionHash,
    status: receipt.status,
    block: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    from: receipt.from,
    to: receipt.to ?? undefined,
    functionName: meta?.functionName,
    args: meta?.args,
    source: "lib",
  })

const wait = async (hash: Hex, meta?: TxMeta) => {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  recordTx(receipt, meta)
  if (receipt.status !== "success")
    throw new Error(
      `transaction ${hash} reverted (block ${receipt.blockNumber})`,
    )
  return receipt
}

export const erc20Balance = (token: Address, owner: Address) =>
  publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  })

export const erc20Allowance = (
  token: Address,
  owner: Address,
  spender: Address,
) =>
  publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  })

export const approve = async (
  from: Address,
  token: Address,
  spender: Address,
  amount: bigint,
) =>
  wait(
    await walletFor(from).writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],

      gas: GAS,
    }),
    { functionName: "approve", args: [spender, amount] },
  )

export const depositUpTo = async (
  from: Address,
  market: Address,
  amount: bigint,
) =>
  wait(
    await walletFor(from).writeContract({
      address: market,
      abi: marketAbi,
      functionName: "depositUpTo",
      args: [amount],

      gas: GAS,
    }),
    { functionName: "depositUpTo", args: [amount] },
  )

/** Queue a withdrawal; returns the batch expiry (the function's return value, read via simulation first). */
export const queueWithdrawal = async (
  from: Address,
  market: Address,
  amount: bigint,
) => {
  const { result: expiry, request } = await publicClient.simulateContract({
    account: from,
    address: market,
    abi: marketAbi,
    functionName: "queueWithdrawal",
    args: [amount],
  })
  await wait(await walletFor(from).writeContract({ ...request, gas: GAS }), {
    functionName: "queueWithdrawal",
    args: [amount],
  })
  return Number(expiry)
}

/** The "keeper" transaction: processes expired batches. Any state-changing call would do the same. */
export const updateState = async (from: Address, market: Address) =>
  wait(
    await walletFor(from).writeContract({
      address: market,
      abi: marketAbi,
      functionName: "updateState",

      gas: GAS,
    }),
    { functionName: "updateState" },
  )

export const executeWithdrawal = async (
  from: Address,
  market: Address,
  lender: Address,
  expiry: number,
) =>
  wait(
    await walletFor(from).writeContract({
      address: market,
      abi: marketAbi,
      functionName: "executeWithdrawal",
      args: [lender, expiry],

      gas: GAS,
    }),
    { functionName: "executeWithdrawal", args: [lender, expiry] },
  )

export const getWithdrawalBatch = (market: Address, expiry: number) =>
  publicClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "getWithdrawalBatch",
    args: [expiry],
  })

export const getAccountWithdrawalStatus = (
  market: Address,
  lender: Address,
  expiry: number,
) =>
  publicClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "getAccountWithdrawalStatus",
    args: [lender, expiry],
  })

export const getAvailableWithdrawalAmount = (
  market: Address,
  lender: Address,
  expiry: number,
) =>
  publicClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "getAvailableWithdrawalAmount",
    args: [lender, expiry],
  })

export const marketBalance = (market: Address, lender: Address) =>
  publicClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "balanceOf",
    args: [lender],
  })

export const blockTimestamp = async () =>
  Number((await publicClient.getBlock()).timestamp)
