/** @jest-environment node */

import {
  advanceRateState,
  integrateRateEvents,
  percentagesFromRateSeconds,
} from "./dailyRates"
import { DecodedMarketEvent } from "../types"

const event = (
  timestamp: number,
  name: string,
  args: Record<string, unknown>,
) => ({ timestamp, name, args }) as DecodedMarketEvent

describe("daily rate accounting", () => {
  it("weights rates inside the interval, including a quiet tail after the last update", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 1200,
      protocolFeeBips: 500,
      isDelinquent: false,
      timeDelinquent: 0,
    }
    const totals = integrateRateEvents(
      state,
      [
        event(43200, "AnnualInterestBipsUpdated", {
          annualInterestBipsUpdated: "1000",
        }),
        event(64800, "ProtocolFeeBipsUpdated", { protocolFeeBips: "1000" }),
      ],
      86400,
      500,
      3600,
    )
    expect(percentagesFromRateSeconds(totals, 86400)).toEqual({
      baseApr: "11.000000",
      penaltyApr: "0.000000",
      effectiveApr: "11.000000",
      protocolFeeApr: "0.675000",
      borrowerApr: "11.675000",
    })
  })

  it("does not treat zero elapsed time as a zero rate", () => {
    expect(
      percentagesFromRateSeconds(
        {
          baseBipsSeconds: 0n,
          penaltyBipsSeconds: 0n,
          protocolBipsSquaredSeconds: 0n,
        },
        0,
      ),
    ).toEqual({
      baseApr: "",
      penaltyApr: "",
      effectiveApr: "",
      protocolFeeApr: "",
      borrowerApr: "",
    })
  })

  it("rounds combined rates once rather than adding rounded components", () => {
    expect(
      percentagesFromRateSeconds(
        {
          baseBipsSeconds: 1n,
          penaltyBipsSeconds: 1n,
          protocolBipsSquaredSeconds: 0n,
        },
        30000,
      ),
    ).toMatchObject({
      baseApr: "0.000000",
      penaltyApr: "0.000000",
      effectiveApr: "0.000001",
    })
  })

  it("keeps charging penalty while a cured delinquency timer unwinds", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 2_200,
      protocolFeeBips: 500,
      isDelinquent: false,
      timeDelinquent: 90_000,
    }
    const rates = advanceRateState(state, 86_400, 1_200, 3_600)

    expect(percentagesFromRateSeconds(rates, 86_400)).toMatchObject({
      baseApr: "22.000000",
      penaltyApr: "12.000000",
      protocolFeeApr: "1.100000",
    })
    expect(state.timeDelinquent).toBe(3_600)
  })

  it("does not advance delinquency time when the market has no penalty rate", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 1_850,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    }
    const rates = advanceRateState(state, 86_400, 0, 345_600)

    expect(percentagesFromRateSeconds(rates, 86_400)).toMatchObject({
      baseApr: "18.500000",
      penaltyApr: "0.000000",
      protocolFeeApr: "0.925000",
    })
    expect(state).toEqual({
      timestamp: 86_400,
      annualInterestBips: 1_850,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    })
  })

  it("weights grace-boundary and rate changes by elapsed seconds", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 1_000,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    }
    const first = advanceRateState(state, 3_600, 1_200, 3_600)
    state.annualInterestBips = 2_000
    const second = advanceRateState(state, 7_200, 1_200, 3_600)
    const rates = {
      baseBipsSeconds: 0n,
      penaltyBipsSeconds: 0n,
      protocolBipsSquaredSeconds: 0n,
    }
    rates.baseBipsSeconds = first.baseBipsSeconds + second.baseBipsSeconds
    rates.penaltyBipsSeconds =
      first.penaltyBipsSeconds + second.penaltyBipsSeconds
    rates.protocolBipsSquaredSeconds =
      first.protocolBipsSquaredSeconds + second.protocolBipsSquaredSeconds

    expect(percentagesFromRateSeconds(rates, 7_200)).toMatchObject({
      baseApr: "15.000000",
      penaltyApr: "6.000000",
      protocolFeeApr: "0.750000",
    })
  })
})
