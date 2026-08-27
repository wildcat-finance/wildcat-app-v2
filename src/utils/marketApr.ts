import { Market } from "@wildcatfi/wildcat-sdk"

import { getMarketImplementationType } from "@/utils/marketImplementation"

type MarketAprDisplayBips = {
  isRevolving: boolean
  configuredAprKind: "annualInterest" | "utilization"
  configuredAprBips: number
  commitmentAprBips?: number
  utilizationBips?: number
  currentProtocolAprBips: number
  currentEffectiveLenderAprBips: number
}

type MarketWithAprDisplay = Market & {
  currentAprDisplayBips?: MarketAprDisplayBips
}

const BIP = 10_000

export const getMarketAprDisplayBips = (
  market: Market,
): MarketAprDisplayBips => {
  const sdkDisplay = (market as MarketWithAprDisplay).currentAprDisplayBips
  if (sdkDisplay) return sdkDisplay

  const revolvingMetrics = market.currentRevolvingAprMetrics
  if (revolvingMetrics) {
    return {
      isRevolving: true,
      configuredAprKind: "utilization",
      configuredAprBips: market.annualInterestBips,
      commitmentAprBips: revolvingMetrics.commitmentFeeBips,
      utilizationBips: revolvingMetrics.utilizationBips,
      currentProtocolAprBips: revolvingMetrics.protocolAprBips,
      currentEffectiveLenderAprBips: revolvingMetrics.effectiveLenderAprBips,
    }
  }

  return {
    isRevolving: false,
    configuredAprKind: "annualInterest",
    configuredAprBips: market.annualInterestBips,
    currentProtocolAprBips: Math.floor(
      (market.protocolFeeBips * market.annualInterestBips) / BIP,
    ),
    currentEffectiveLenderAprBips:
      market.annualInterestBips +
      (market.isIncurringPenalties ? market.delinquencyFeeBips : 0),
  }
}

export const getDisplayLenderAprBips = (market: Market): number =>
  getMarketAprDisplayBips(market).currentEffectiveLenderAprBips

/**
 * Whether the APR the borrower configures on this market is the utilization
 * APR rather than a base APR.
 *
 * Two independent signals identify a revolving market and either one alone is
 * enough: the kind recorded by the hooks factory/subgraph (`marketKind`) and
 * the revolving metrics carried by whichever read produced the numbers we
 * render (`configuredAprKind`). Reads that drop one of the two exist - a V1
 * projection, a subgraph row whose `marketKind` did not parse, lens data
 * without the unified V2.5 fields - and copy keyed off only one of them can end
 * up calling a utilization APR a "base APR". Deriving the wording from both
 * keeps the label and the number it sits next to from disagreeing.
 */
export const isRevolvingAprMarket = (market: Market): boolean =>
  getMarketImplementationType(market) === "revolving" ||
  getMarketAprDisplayBips(market).configuredAprKind === "utilization"

export const getConfiguredAprLabelKey = (market: Market): string =>
  isRevolvingAprMarket(market)
    ? "common.fields.utilizationApr"
    : "marketParameters.baseAPR"
