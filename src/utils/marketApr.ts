import { Market } from "@wildcatfi/wildcat-sdk"

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

export const getConfiguredAprLabelKey = (market: Market): string =>
  getMarketAprDisplayBips(market).configuredAprKind === "utilization"
    ? "borrowerMarketDetails.parameters.utilizationAPR"
    : "borrowerMarketDetails.parameters.baseAPR"
