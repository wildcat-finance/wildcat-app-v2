import { BigNumber } from "ethers"
import {
  type Abi,
  type Address,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem"

import {
  type SignerOrProvider,
  type SupportedChainId,
  hasDeploymentAddress,
} from "@wildcatfi/wildcat-sdk"

import { MarketLensV2Abi, MarketLensAbi } from "./lensAbis"

const Deployments: Record<
  number,
  { MarketLens?: string; MarketLensV2?: string }
> = {
  1: {
    MarketLens: "0xf1D516954f96c1363f8b0aE48D79c8ddE6237847",
    MarketLensV2: "0xfDA5C5B96bb198D2fca1A01d759620B64Ae5afE7",
  },
  11155111: {
    MarketLens: "0xb3925B31A8AeDCE8CFc885e0D5DAa057A1EA8A72",
    MarketLensV2: "0x5D8cEacEe19c06C3b4108b8Ae5B881eb0240B9c7",
  },
  9746: {
    MarketLensV2: "0xBA370992D7041b5C3B9AEBc61E0CC52C57138918",
  },
  9745: {
    MarketLensV2: "0x7e5d6d9f9a2091dD781118514F5397A8107c81c5",
  },
}

/**
 * Recursively converts viem-decoded values (bigint) to ethers-compatible
 * values (BigNumber) so they work with the SDK's `updateWith` methods.
 */
function viemToEthers(value: unknown): unknown {
  if (typeof value === "bigint") {
    return BigNumber.from(value)
  }
  if (Array.isArray(value)) {
    const converted = value.map(viemToEthers)
    // ethers returns Result objects with named properties on arrays.
    // viem returns plain arrays for tuple[] but objects for tuples.
    // The SDK accesses by named property, so we need to preserve that.
    return converted
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
  // SignerOrProvider is ethers Signer | Provider — both have .call() or a .provider
  const p =
    "call" in provider
      ? provider
      : "provider" in provider
        ? (provider as { provider: { call: Function } }).provider
        : provider
  const result = await (p as { call: Function }).call({ to, data })
  return result as string
}

function createViemLensV2(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  const address = Deployments[chainId]?.MarketLensV2
  if (!address) throw new Error(`No MarketLensV2 for chain ${chainId}`)

  return {
    async getMarketsData(markets: string[]) {
      const calldata = encodeFunctionData({
        abi: MarketLensV2Abi,
        functionName: "getMarketsData",
        args: [markets as Address[]],
      })
      const raw = await rawCall(provider, address, calldata)
      const decoded = decodeFunctionResult({
        abi: MarketLensV2Abi,
        functionName: "getMarketsData",
        data: raw as `0x${string}`,
      })
      return viemToEthers(decoded) as any[]
    },

    async getMarketsDataWithLenderStatus(lender: string, markets: string[]) {
      const calldata = encodeFunctionData({
        abi: MarketLensV2Abi,
        functionName: "getMarketsDataWithLenderStatus",
        args: [lender as Address, markets as Address[]],
      })
      const raw = await rawCall(provider, address, calldata)
      const decoded = decodeFunctionResult({
        abi: MarketLensV2Abi,
        functionName: "getMarketsDataWithLenderStatus",
        data: raw as `0x${string}`,
      })
      return viemToEthers(decoded) as any[]
    },
  }
}

function createViemLensV1(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  const address = Deployments[chainId]?.MarketLens
  if (!address) throw new Error(`No MarketLens for chain ${chainId}`)

  return {
    async getMarketsData(markets: string[]) {
      const calldata = encodeFunctionData({
        abi: MarketLensAbi,
        functionName: "getMarketsData",
        args: [markets as Address[]],
      })
      const raw = await rawCall(provider, address, calldata)
      const decoded = decodeFunctionResult({
        abi: MarketLensAbi,
        functionName: "getMarketsData",
        data: raw as `0x${string}`,
      })
      return viemToEthers(decoded) as any[]
    },

    async getMarketsDataWithLenderStatus(lender: string, markets: string[]) {
      const calldata = encodeFunctionData({
        abi: MarketLensAbi,
        functionName: "getMarketsDataWithLenderStatus",
        args: [lender as Address, markets as Address[]],
      })
      const raw = await rawCall(provider, address, calldata)
      const decoded = decodeFunctionResult({
        abi: MarketLensAbi,
        functionName: "getMarketsDataWithLenderStatus",
        data: raw as `0x${string}`,
      })
      return viemToEthers(decoded) as any[]
    },
  }
}

export function getViemLensContract(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  return createViemLensV1(chainId, provider)
}

export function getViemLensV2Contract(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  return createViemLensV2(chainId, provider)
}
