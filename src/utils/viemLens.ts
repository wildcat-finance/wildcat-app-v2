import {
  type SignerOrProvider,
  type SupportedChainId,
  getDeploymentAddress,
} from "@wildcatfi/wildcat-sdk"
/* eslint-disable camelcase */
import {
  MarketLens__factory,
  MarketLensV2__factory,
} from "@wildcatfi/wildcat-sdk/dist/typechain"
/* eslint-enable camelcase */
import { BigNumber } from "ethers"
import { decodeFunctionResult, encodeFunctionData } from "viem"

// eslint-disable-next-line camelcase
const marketLensV2Abi = MarketLensV2__factory.abi as readonly Record<
  string,
  unknown
>[]
// eslint-disable-next-line camelcase
const marketLensAbi = MarketLens__factory.abi as readonly Record<
  string,
  unknown
>[]

function viemToEthers(value: unknown): unknown {
  if (typeof value === "bigint") {
    return BigNumber.from(value)
  }
  if (Array.isArray(value)) {
    return value.map(viemToEthers)
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    Object.entries(value).forEach(([k, v]) => {
      result[k] = viemToEthers(v)
    })
    return result
  }
  return value
}

async function rawCall(
  provider: SignerOrProvider,
  to: string,
  data: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = "call" in provider ? provider : (provider as any).provider
  const result = await p.call({ to, data })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: abi as any,
    functionName,
    args,
  })
  return rawCall(provider, address, calldata).then((raw) => {
    const decoded = decodeFunctionResult({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any,
      functionName,
      data: raw as `0x${string}`,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return createViemLens(chainId, provider, "MarketLens", marketLensAbi)
}

export function getViemLensV2Contract(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
) {
  return createViemLens(chainId, provider, "MarketLensV2", marketLensV2Abi)
}
