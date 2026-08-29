import {
  getLiveGracePeriodState,
  getLiveTimeDelinquent,
  hasLiveDelinquencyClock,
} from "./delinquencyClock"

const market = (
  overrides: Partial<Parameters<typeof getLiveTimeDelinquent>[0]> = {},
) => ({
  isClosed: false,
  isDelinquent: false,
  timeDelinquent: 30,
  delinquencyGracePeriod: 60,
  lastInterestAccruedTimestamp: 100,
  ...overrides,
})

describe("delinquency clock", () => {
  it("rises while the market is delinquent", () => {
    expect(getLiveTimeDelinquent(market({ isDelinquent: true }), 105)).toBe(35)
  })

  it("burns back down while the market is healthy", () => {
    expect(getLiveTimeDelinquent(market(), 105)).toBe(25)
    expect(getLiveTimeDelinquent(market(), 140)).toBe(0)
  })

  it("does not run backwards when the local clock trails the lens read", () => {
    expect(getLiveTimeDelinquent(market(), 95)).toBe(30)
  })

  it("resets a closed market", () => {
    expect(getLiveTimeDelinquent(market({ isClosed: true }), 105)).toBe(0)
  })

  it("switches into penalties only after crossing the grace period", () => {
    expect(
      getLiveGracePeriodState(market({ isDelinquent: true }), 130),
    ).toEqual({
      timeDelinquent: 60,
      isIncurringPenalties: false,
      timerSeconds: 0,
    })
    expect(
      getLiveGracePeriodState(market({ isDelinquent: true }), 131),
    ).toEqual({
      timeDelinquent: 61,
      isIncurringPenalties: true,
      timerSeconds: 1,
    })
  })

  it("counts penalty recovery down, then restores available grace", () => {
    const recovering = market({ timeDelinquent: 90 })

    expect(getLiveGracePeriodState(recovering, 105)).toEqual({
      timeDelinquent: 85,
      isIncurringPenalties: true,
      timerSeconds: 25,
    })
    expect(getLiveGracePeriodState(recovering, 131)).toEqual({
      timeDelinquent: 59,
      isIncurringPenalties: false,
      timerSeconds: 1,
    })
  })

  it("keeps ticking until a healthy market has burned back to zero", () => {
    expect(hasLiveDelinquencyClock(market(), 129)).toBe(true)
    expect(hasLiveDelinquencyClock(market(), 130)).toBe(false)
    expect(
      hasLiveDelinquencyClock(
        market({ isDelinquent: true, timeDelinquent: 0 }),
        100,
      ),
    ).toBe(true)
  })
})
