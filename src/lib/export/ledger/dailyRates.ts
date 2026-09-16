import { formatFixed } from "../bigint"
import { DecodedMarketEvent } from "../types"

export type RateState = {
  timestamp: number
  annualInterestBips: number
  protocolFeeBips: number
  isDelinquent: boolean
  timeDelinquent: number
}

export type RateSeconds = {
  baseBipsSeconds: bigint
  penaltyBipsSeconds: bigint
  protocolBipsSquaredSeconds: bigint
}

// Mirrors FeeMath.updateTimeDelinquentAndGetPenaltyTime in v2-protocol.
export function advanceRateState(
  state: RateState,
  timestamp: number,
  delinquencyFeeBips: number,
  gracePeriod: number,
): RateSeconds {
  const elapsed = Math.max(0, timestamp - state.timestamp)
  const previousTimeDelinquent = state.timeDelinquent
  let penaltySeconds = 0
  // FeeMath only updates the delinquency timer when a market has a non-zero
  // penalty rate. A zero-penalty market can be liquidity-delinquent while its
  // stored timer remains unchanged indefinitely.
  if (delinquencyFeeBips > 0) {
    if (state.isDelinquent) {
      state.timeDelinquent = previousTimeDelinquent + elapsed
      penaltySeconds = Math.max(
        0,
        elapsed - Math.max(0, gracePeriod - previousTimeDelinquent),
      )
    } else {
      state.timeDelinquent = Math.max(0, previousTimeDelinquent - elapsed)
      penaltySeconds = Math.min(
        elapsed,
        Math.max(0, previousTimeDelinquent - gracePeriod),
      )
    }
  }
  state.timestamp = timestamp
  return {
    baseBipsSeconds: BigInt(state.annualInterestBips) * BigInt(elapsed),
    penaltyBipsSeconds: BigInt(delinquencyFeeBips) * BigInt(penaltySeconds),
    protocolBipsSquaredSeconds:
      BigInt(state.annualInterestBips) *
      BigInt(state.protocolFeeBips) *
      BigInt(elapsed),
  }
}

export function percentagesFromRateSeconds(
  values: RateSeconds,
  elapsed: number,
) {
  if (elapsed <= 0) {
    return {
      baseApr: "",
      penaltyApr: "",
      protocolFeeApr: "",
      effectiveApr: "",
      borrowerApr: "",
    }
  }
  const seconds = BigInt(elapsed)
  const rounded = (numerator: bigint, denominator: bigint) =>
    (numerator + denominator / 2n) / denominator
  return {
    baseApr: formatFixed(rounded(values.baseBipsSeconds * 10_000n, seconds), 6),
    penaltyApr: formatFixed(
      rounded(values.penaltyBipsSeconds * 10_000n, seconds),
      6,
    ),
    effectiveApr: formatFixed(
      rounded(
        (values.baseBipsSeconds + values.penaltyBipsSeconds) * 10_000n,
        seconds,
      ),
      6,
    ),
    borrowerApr: formatFixed(
      rounded(
        (values.baseBipsSeconds + values.penaltyBipsSeconds) * 10_000n +
          values.protocolBipsSquaredSeconds,
        seconds,
      ),
      6,
    ),
    protocolFeeApr: formatFixed(
      rounded(values.protocolBipsSquaredSeconds, seconds),
      6,
    ),
  }
}

/** Integrate the actual snapshot interval, applying changes in log order. */
export function integrateRateEvents(
  state: RateState,
  events: DecodedMarketEvent[],
  endTimestamp: number,
  delinquencyFeeBips: number,
  gracePeriod: number,
): RateSeconds {
  const totals: RateSeconds = {
    baseBipsSeconds: 0n,
    penaltyBipsSeconds: 0n,
    protocolBipsSquaredSeconds: 0n,
  }
  const advance = (timestamp: number) => {
    const values = advanceRateState(
      state,
      timestamp,
      delinquencyFeeBips,
      gracePeriod,
    )
    totals.baseBipsSeconds += values.baseBipsSeconds
    totals.penaltyBipsSeconds += values.penaltyBipsSeconds
    totals.protocolBipsSquaredSeconds += values.protocolBipsSquaredSeconds
  }
  events.forEach((event) => {
    if (
      ![
        "AnnualInterestBipsUpdated",
        "ProtocolFeeBipsUpdated",
        "StateUpdated",
        "MarketClosed",
      ].includes(event.name)
    )
      return
    advance(event.timestamp)
    if (event.name === "AnnualInterestBipsUpdated")
      state.annualInterestBips = Number(event.args.annualInterestBipsUpdated)
    if (event.name === "ProtocolFeeBipsUpdated")
      state.protocolFeeBips = Number(event.args.protocolFeeBips)
    if (event.name === "StateUpdated")
      state.isDelinquent = event.args.isDelinquent === true
    if (event.name === "MarketClosed") {
      state.annualInterestBips = 0
      state.timeDelinquent = 0
    }
  })
  advance(endTimestamp)
  return totals
}
