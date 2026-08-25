import type { Hex } from "viem"

const marketTopicIndexBySelector = new Map<string, number>([
  // legacy: MarketDeployed(address,address,string,string,address,uint256,...)
  ["0x6f8c7c94fc16393d1ebec38de9899ba8c6bd860a025aa60063b7cf4c40a16c09", 2],
  // v2.5: MarketDeployed(address,address,address,address,address,address,...)
  ["0x0552cf5c4747e14ddcf5dfd871616003deec2f67a7e9c3424d57850385584b9a", 3],
])

export type MarketDeploymentReceipt = {
  logs: readonly {
    address?: string
    data: string
    topics: readonly string[]
  }[]
}

const addressFromTopic = (topic: string): string | undefined => {
  if (!/^0x[0-9a-fA-F]{64}$/.test(topic)) return undefined
  return `0x${topic.slice(-40).toLowerCase()}`
}

export const getDeployedMarketFromReceipt = (
  receipt: MarketDeploymentReceipt,
  factoryAddress?: string,
): string | undefined => {
  const expectedFactory = factoryAddress?.toLowerCase()

  return receipt.logs
    .filter(
      (log) =>
        !expectedFactory ||
        !log.address ||
        log.address.toLowerCase() === expectedFactory,
    )
    .map((log) => {
      const marketTopicIndex = marketTopicIndexBySelector.get(
        log.topics[0]?.toLowerCase(),
      )
      return marketTopicIndex === undefined
        ? undefined
        : addressFromTopic(log.topics[marketTopicIndex])
    })
    .find((market): market is string => market !== undefined)
}

export const confirmMarketDeployment = async ({
  receipt,
  predictedMarket,
  factoryAddress,
  getCode,
}: {
  receipt: MarketDeploymentReceipt
  predictedMarket: string
  factoryAddress?: string
  getCode: (address: string) => Promise<Hex | string>
}): Promise<string> => {
  const emittedMarket = getDeployedMarketFromReceipt(receipt, factoryAddress)

  if (
    emittedMarket &&
    emittedMarket.toLowerCase() !== predictedMarket.toLowerCase()
  ) {
    throw Error("Transaction deployed an unexpected market address")
  }

  // The CREATE2 address is known before submission. If a future factory changes
  // its event again, deployed code is enough to resume the remaining steps.
  if (!emittedMarket && (await getCode(predictedMarket)) === "0x") {
    throw Error(
      "MarketDeployed event not found and no code exists at the predicted market address",
    )
  }

  return predictedMarket
}
