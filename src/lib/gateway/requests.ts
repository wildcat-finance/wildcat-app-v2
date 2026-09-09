import { getOperationAST, Kind, parse } from "graphql"

// The gateway token grants more privileges than anonymous app traffic needs.
// Keep node administration, tracing and node-held signing out of this proxy.
const RPC_METHODS = new Set([
  "web3_clientVersion",
  "web3_sha3",
  "net_version",
  "net_listening",
  "eth_chainId",
  "eth_syncing",
  "eth_blockNumber",
  "eth_blobBaseFee",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_getProof",
  "eth_call",
  "eth_estimateGas",
  "eth_createAccessList",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getBlockReceipts",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getLogs",
  "eth_newFilter",
  "eth_newBlockFilter",
  "eth_newPendingTransactionFilter",
  "eth_getFilterChanges",
  "eth_getFilterLogs",
  "eth_uninstallFilter",
  "eth_sendRawTransaction",
])

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

export const isAllowedRpcRequest = (body: unknown) => {
  const calls = Array.isArray(body) ? body : [body]
  return (
    calls.length > 0 &&
    calls.length <= 20 &&
    calls.every(
      (call) =>
        isObject(call) &&
        call.jsonrpc === "2.0" &&
        typeof call.method === "string" &&
        RPC_METHODS.has(call.method) &&
        (call.id === undefined ||
          call.id === null ||
          typeof call.id === "string" ||
          (typeof call.id === "number" && Number.isSafeInteger(call.id))) &&
        (call.params === undefined ||
          Array.isArray(call.params) ||
          isObject(call.params)),
    )
  )
}

export const isAllowedSubgraphRequest = (body: unknown) => {
  if (
    !isObject(body) ||
    typeof body.query !== "string" ||
    (body.operationName != null && typeof body.operationName !== "string") ||
    (body.variables != null && !isObject(body.variables))
  ) {
    return false
  }
  try {
    const document = parse(body.query, { maxTokens: 20_000 })
    const operation = getOperationAST(document, body.operationName as string)
    return (
      operation?.operation === "query" &&
      document.definitions.every(
        (definition) =>
          definition.kind === Kind.FRAGMENT_DEFINITION ||
          (definition.kind === Kind.OPERATION_DEFINITION &&
            definition.operation === "query"),
      )
    )
  } catch {
    return false
  }
}
