import {
  HooksFactory__factory as HooksFactoryFactory,
  WildcatArchController__factory as WildcatArchControllerFactory,
  WildcatMarketController__factory as WildcatMarketControllerFactory,
  WildcatMarketV2__factory as WildcatMarketV2Factory,
} from "@wildcatfi/wildcat-sdk/dist/typechain"
import { utils } from "ethers"

export const archControllerInterface = new utils.Interface(
  WildcatArchControllerFactory.abi,
)
export const marketInterface = new utils.Interface(WildcatMarketV2Factory.abi)
export const hooksFactoryInterface = new utils.Interface(
  HooksFactoryFactory.abi,
)
export const marketControllerInterface = new utils.Interface(
  WildcatMarketControllerFactory.abi,
)

export const metadataInterface = new utils.Interface([
  "function version() view returns (string)",
  "function borrower() view returns (address)",
  "function feeRecipient() view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function asset() view returns (address)",
  "function delinquencyFeeBips() view returns (uint16)",
  "function delinquencyGracePeriod() view returns (uint32)",
  "function withdrawalBatchDuration() view returns (uint32)",
  "function currentState() view returns (tuple(bool isClosed,uint128 maxTotalSupply,uint128 accruedProtocolFees,uint128 normalizedUnclaimedWithdrawals,uint104 scaledTotalSupply,uint104 scaledPendingWithdrawals,uint32 pendingWithdrawalExpiry,bool isDelinquent,uint32 timeDelinquent,uint16 protocolFeeBips,uint16 annualInterestBips,uint16 reserveRatioBips,uint112 scaleFactor,uint32 lastInterestAccruedTimestamp))",
  "function totalAssets() view returns (uint256)",
  "function totalDebts() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function scaledBalanceOf(address) view returns (uint256)",
])

export const erc20Interface = new utils.Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
])

export const MARKET_ADDED_TOPIC = utils.id("MarketAdded(address,address)")
export const MARKET_REMOVED_TOPIC = utils.id("MarketRemoved(address)")
export const CONTROLLER_ADDED_TOPIC = utils.id(
  "ControllerAdded(address,address)",
)
export const HOOKS_MARKET_DEPLOYED_TOPIC =
  hooksFactoryInterface.getEventTopic("MarketDeployed")
export const CONTROLLER_MARKET_DEPLOYED_TOPIC =
  marketControllerInterface.getEventTopic("MarketDeployed")
export const TRANSFER_TOPIC = utils.id("Transfer(address,address,uint256)")

export const supportedMarketTopics = new Map(
  Object.values(marketInterface.events).map((event) => [
    marketInterface.getEventTopic(event).toLowerCase(),
    event,
  ]),
)

export function decodeMarketAdded(log: { topics: string[]; data: string }) {
  if (log.topics.length > 1) {
    return {
      controller: utils
        .getAddress(`0x${log.topics[1].slice(-40)}`)
        .toLowerCase(),
      market: utils.getAddress(`0x${log.data.slice(-40)}`).toLowerCase(),
      layout: "controller_indexed" as const,
    }
  }
  const [controller, market] = utils.defaultAbiCoder.decode(
    ["address", "address"],
    log.data,
  )
  return {
    controller: String(controller).toLowerCase(),
    market: String(market).toLowerCase(),
    layout: "unindexed" as const,
  }
}
