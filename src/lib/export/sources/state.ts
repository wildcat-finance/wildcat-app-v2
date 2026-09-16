import { utils } from "ethers"

import { ExportRpc, toBlockHex } from "./rpc"
import { metadataInterface } from "../abi/registry"

export async function contractRead<T>(
  rpc: ExportRpc,
  address: string,
  functionName: string,
  args: unknown[],
  block: number,
): Promise<T> {
  const data = metadataInterface.encodeFunctionData(functionName, args)
  const result = await rpc.call<string>("eth_call", [
    { to: address, data },
    toBlockHex(block),
  ])
  const decoded = metadataInterface.decodeFunctionResult(functionName, result)
  return (decoded.length === 1 ? decoded[0] : decoded) as T
}

export async function contractReadMany<T>(
  rpc: ExportRpc,
  address: string,
  calls: { functionName: string; args: unknown[]; block: number }[],
): Promise<T[]> {
  const results = await rpc.batch<string>(
    calls.map(({ functionName, args, block }) => ({
      method: "eth_call",
      params: [
        {
          to: address,
          data: metadataInterface.encodeFunctionData(functionName, args),
        },
        toBlockHex(block),
      ],
    })),
  )
  return results.map((result, index) => {
    const decoded = metadataInterface.decodeFunctionResult(
      calls[index].functionName,
      result,
    )
    return (decoded.length === 1 ? decoded[0] : decoded) as T
  })
}

export async function erc20Read<T>(
  rpc: ExportRpc,
  iface: utils.Interface,
  address: string,
  functionName: string,
  args: unknown[],
  block: number,
): Promise<T> {
  const data = iface.encodeFunctionData(functionName, args)
  const result = await rpc.call<string>("eth_call", [
    { to: address, data },
    toBlockHex(block),
  ])
  const decoded = iface.decodeFunctionResult(functionName, result)
  return (decoded.length === 1 ? decoded[0] : decoded) as T
}
