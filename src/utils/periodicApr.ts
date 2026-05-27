import { Market } from "@wildcatfi/wildcat-sdk"

export type PendingPeriodicAprChange = {
  proposedAprBips: number
  proposalTimestamp: number
  responseWindowStart: number
  responseWindowEnd: number
  isExecutable: boolean
  isResponseWindowOpen: boolean
}

export const getPendingPeriodicAprChange = (
  market: Market,
  nowSec = Date.now() / 1000,
): PendingPeriodicAprChange | undefined => {
  const config = market.periodicHooksConfig
  if (!config?.pendingAprChangeProposalTimestamp) return undefined

  return {
    proposedAprBips: config.pendingAprChangeAnnualInterestBips,
    proposalTimestamp: config.pendingAprChangeProposalTimestamp,
    responseWindowStart: config.pendingAprChangeResponseWindowStart,
    responseWindowEnd: config.pendingAprChangeResponseWindowEnd,
    isExecutable: nowSec >= config.pendingAprChangeResponseWindowEnd,
    isResponseWindowOpen:
      nowSec >= config.pendingAprChangeResponseWindowStart &&
      nowSec < config.pendingAprChangeResponseWindowEnd,
  }
}
