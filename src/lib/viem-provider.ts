import type {
  Provider as SdkProvider,
  Signer as SdkSigner,
} from "@wildcatfi/wildcat-sdk"
import type {
  Address,
  Chain,
  Hash,
  Hex,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem"

type RpcRequestArgs = {
  method: string
  params?: unknown
}

type RequestClient = {
  request: (args: RpcRequestArgs) => Promise<unknown>
}

type CallTransaction = {
  to?: string
  data?: string
  from?: string
}

type SendTransactionInput = Parameters<SdkSigner["sendTransaction"]>[0]

export type ViemProviderLike = SdkProvider & {
  request: (args: RpcRequestArgs) => Promise<unknown>
  send: (method: string, params?: unknown[]) => Promise<unknown>
  call: (
    transaction: CallTransaction,
    blockNumber?: number | bigint,
  ) => Promise<Hex>
  getCode: (address: string) => Promise<Hex>
  getBlockNumber: () => Promise<number>
  waitForTransaction: (hash: string) => Promise<TransactionReceipt>
}

export type ViemSignerWithChainId = SdkSigner & {
  _isSigner: true
  chainId: number
  provider: ViemProviderLike
  getAddress: () => Promise<Address>
  signMessage: (message: string) => Promise<Hex>
  sendTransaction: (
    transaction: SendTransactionInput,
  ) => Promise<{ hash: Hash; wait: () => Promise<TransactionReceipt> }>
}

const isRequestClient = (client: unknown): client is RequestClient =>
  typeof (client as RequestClient | undefined)?.request === "function"

const normalizeValue = (
  value: SendTransactionInput["value"],
): bigint | undefined => {
  if (value === undefined) {
    return undefined
  }
  return typeof value === "bigint" ? value : BigInt(value)
}

export const createViemProvider = (
  publicClient: PublicClient,
): ViemProviderLike => {
  const request = (args: RpcRequestArgs) => {
    if (isRequestClient(publicClient)) {
      return publicClient.request(args)
    }
    throw Error("Public client does not expose an RPC request method")
  }

  return {
    request,
    send: (method, params = []) => request({ method, params }),
    call: async (
      transaction: CallTransaction,
      blockNumber?: number | bigint,
    ) => {
      const { to, data, from } = transaction
      const result = await publicClient.call({
        account: from as Address | undefined,
        to: to as Address | undefined,
        data: data as Hex | undefined,
        blockNumber:
          blockNumber === undefined ? undefined : BigInt(blockNumber),
      })
      return result.data ?? "0x"
    },
    getCode: async (address) =>
      (await publicClient.getBytecode({ address: address as Address })) ?? "0x",
    getBlockNumber: async () => Number(await publicClient.getBlockNumber()),
    waitForTransaction: (hash) =>
      publicClient.waitForTransactionReceipt({ hash: hash as Hash }),
  }
}

export const createViemSigner = ({
  walletClient,
  publicClient,
}: {
  walletClient: WalletClient
  publicClient: PublicClient
}): ViemSignerWithChainId | undefined => {
  const account = walletClient.account?.address
  const chain = walletClient.chain as Chain | undefined
  if (!account || !chain) {
    return undefined
  }

  const provider = createViemProvider(publicClient)

  return {
    _isSigner: true,
    chainId: chain.id,
    provider,
    getAddress: async () => account,
    signMessage: (message) =>
      walletClient.signMessage({
        account,
        message,
      }),
    sendTransaction: async ({ to, data, value }) => {
      const hash = await walletClient.sendTransaction({
        account,
        chain,
        to: to as Address | undefined,
        data: data as Hex | undefined,
        value: normalizeValue(value),
      })
      return {
        hash,
        wait: () => provider.waitForTransaction(hash),
      }
    },
  }
}
