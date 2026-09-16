/** @jest-environment node */

import { utils } from "ethers"

import {
  CONTROLLER_MARKET_DEPLOYED_TOPIC,
  decodeMarketAdded,
  hooksFactoryInterface,
  HOOKS_MARKET_DEPLOYED_TOPIC,
  marketControllerInterface,
  marketInterface,
  supportedMarketTopics,
} from "./registry"

const requiredEvents = [
  "Deposit",
  "Borrow",
  "DebtRepaid",
  "WithdrawalQueued",
  "WithdrawalExecuted",
  "WithdrawalBatchCreated",
  "WithdrawalBatchPayment",
  "WithdrawalBatchExpired",
  "WithdrawalBatchClosed",
  "FeesCollected",
  "InterestAndFeesAccrued",
  "StateUpdated",
  "Transfer",
  "Approval",
  "MaxTotalSupplyUpdated",
  "AnnualInterestBipsUpdated",
  "ReserveRatioBipsUpdated",
  "ProtocolFeeBipsUpdated",
  "MarketClosed",
  "AccountSanctioned",
  "SanctionedAccountAssetsQueuedForWithdrawal",
  "SanctionedAccountAssetsSentToEscrow",
  "SanctionedAccountWithdrawalSentToEscrow",
  "ChangedSpherexOperator",
  "ChangedSpherexEngineAddress",
  "ForceBuyBack",
] as const

describe("export ABI registry", () => {
  it.each(requiredEvents)("supports %s with its canonical topic", (name) => {
    const event = marketInterface.getEvent(name)
    expect(
      supportedMarketTopics.get(
        marketInterface.getEventTopic(event).toLowerCase(),
      ),
    ).toBe(event)
  })

  it("decodes both historical MarketAdded layouts", () => {
    const controller = "0x1111111111111111111111111111111111111111"
    const market = "0x2222222222222222222222222222222222222222"
    const indexed = decodeMarketAdded({
      topics: [
        utils.id("MarketAdded(address,address)"),
        utils.hexZeroPad(controller, 32),
      ],
      data: utils.defaultAbiCoder.encode(["address"], [market]),
    })
    const unindexed = decodeMarketAdded({
      topics: [utils.id("MarketAdded(address,address)")],
      data: utils.defaultAbiCoder.encode(
        ["address", "address"],
        [controller, market],
      ),
    })
    expect(indexed).toEqual({
      controller,
      market,
      layout: "controller_indexed",
    })
    expect(unindexed).toEqual({ controller, market, layout: "unindexed" })
  })

  it("pins factory and controller deployment provenance topics", () => {
    expect(HOOKS_MARKET_DEPLOYED_TOPIC).toBe(
      hooksFactoryInterface.getEventTopic("MarketDeployed"),
    )
    expect(CONTROLLER_MARKET_DEPLOYED_TOPIC).toBe(
      marketControllerInterface.getEventTopic("MarketDeployed"),
    )
  })
})
