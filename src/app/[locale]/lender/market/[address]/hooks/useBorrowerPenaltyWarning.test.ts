import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { getBorrowerPenaltyWarning } from "./useBorrowerPenaltyWarning"
import {
  borrowerPenaltyWarningThresholdSeconds,
  shouldMarketTriggerBorrowerPenaltyWarning,
} from "../utils"

const BORROWER = "0x0000000000000000000000000000000000000001"
const OTHER_BORROWER = "0x0000000000000000000000000000000000000002"

const makeMarket = (address: string, overrides: Partial<Market> = {}): Market =>
  ({
    address,
    borrower: BORROWER,
    chainId: 11155111,
    isClosed: false,
    isIncurringPenalties: false,
    timeDelinquent: 0,
    delinquencyGracePeriod: 3_600,
    ...overrides,
  }) as Market

const makeAccount = (market: Market): MarketAccount =>
  ({ market }) as MarketAccount

const makeTriggeringMarket = (
  address: string,
  overrides: Partial<Market> = {},
): Market => {
  const delinquencyGracePeriod = 3_600
  return makeMarket(address, {
    delinquencyGracePeriod,
    isIncurringPenalties: true,
    timeDelinquent:
      delinquencyGracePeriod + borrowerPenaltyWarningThresholdSeconds,
    ...overrides,
  })
}

describe("getBorrowerPenaltyWarning", () => {
  it("uses triggering markets for the same borrower and chain", () => {
    const currentMarket = makeMarket(
      "0x0000000000000000000000000000000000000010",
    )
    const triggeringMarket = makeTriggeringMarket(
      "0x0000000000000000000000000000000000000011",
    )
    const otherBorrowerMarket = makeTriggeringMarket(
      "0x0000000000000000000000000000000000000012",
      { borrower: OTHER_BORROWER },
    )
    const otherChainMarket = makeTriggeringMarket(
      "0x0000000000000000000000000000000000000013",
      { chainId: 1 },
    )
    const closedMarket = makeTriggeringMarket(
      "0x0000000000000000000000000000000000000014",
      { isClosed: true },
    )

    const result = getBorrowerPenaltyWarning(currentMarket, [
      makeAccount(triggeringMarket),
      makeAccount(otherBorrowerMarket),
      makeAccount(otherChainMarket),
      makeAccount(closedMarket),
    ])

    expect(result).toEqual({
      shouldWarn: true,
      triggeringMarkets: [triggeringMarket],
    })
  })

  it("prefers the current market's fresher state", () => {
    const address = "0x0000000000000000000000000000000000000020"
    const currentMarket = makeMarket(address)
    const staleCatalogueMarket = makeTriggeringMarket(address)

    const result = getBorrowerPenaltyWarning(currentMarket, [
      makeAccount(staleCatalogueMarket),
    ])

    expect(result).toEqual({
      shouldWarn: false,
      triggeringMarkets: [],
    })
  })

  it("can warn from the current market before the catalogue loads", () => {
    const currentMarket = makeTriggeringMarket(
      "0x0000000000000000000000000000000000000030",
    )

    const result = getBorrowerPenaltyWarning(currentMarket, [])

    expect(result.shouldWarn).toBe(true)
    expect(result.triggeringMarkets).toEqual([currentMarket])
    expect(shouldMarketTriggerBorrowerPenaltyWarning(currentMarket)).toBe(true)
  })
})
