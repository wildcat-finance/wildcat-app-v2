import { BigNumber } from "ethers"
import {
  type Address,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem"

import {
  type SignerOrProvider,
  type SupportedChainId,
  getDeploymentAddress,
} from "@wildcatfi/wildcat-sdk"
import {
  MarketLens__factory,
  MarketLensV2__factory,
} from "@wildcatfi/wildcat-sdk/dist/typechain"

const MarketLensV2Abi = MarketLensV2__factory.abi as readonly Record<string, unknown>[]
const MarketLensAbi = MarketLens__factory.abi as readonly Record<string, unknown>[]

function viemToEthers(value: unknown): unknown {
  if (typeof value === "bigint") {
    return BigNumber.from(value)
  }
  if (Array.isArray(value)) {
    return value.map(viemToEthers)
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = viemToEthers(v)
    }
    return result
  }
  return value
}

async function rawCall(
  provider: SignerOrProvider,
  to: string,
  data: string,
): Promise<string> {
  const p =
    "call" in provider
      ? provider
      : "provider" in provider
        ? (provider as { provider: { call: Function } }).provider
        : provider
  const result = await (p as { call: Function }).call({ to, data })
  return result as string
}

function callAndDecode(
  abi: readonly Record<string, unknown>[],
  provider: SignerOrProvider,
  address: string,
  functionName: string,
  args: unknown[],
) {
  const calldata = encodeFunctionData({
    abi: abi as any,
    functionName,
    args,
  })
  return rawCall(provider, address, calldata).then((raw) => {
    const decoded = decodeFunctionResult({
      abi: abi as any,
      functionName,
      data: raw as `0x${string}`,
    })
    return viemToEthers(decoded) as any[]
  })
}

function createViemLens(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
  deploymentName: "MarketLens" | "MarketLensV2",
  abi: readonly Record<string, unknown>[],
) {
  const address = getDeploymentAddress(chainId, deploymentName)

  return {
    getMarketsData: (markets: string[]) =>
      callAndDecode(abi, provider, address, "getMarketsData", [markets]),

    getMarketsDataWithLenderStatus: (lender: string, markets: string[]) =>
      callAndDecode(abi, provider, address, "getMarketsDataWithLenderStatus", [
        lender,
        markets,
      ]),
  }
}

export function getViemLensContract(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  return createViemLens(chainId, provider, "MarketLens", MarketLensAbi)
}

export function getViemLensV2Contract(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  return createViemLens(chainId, provider, "MarketLensV2", MarketLensV2Abi)
}
