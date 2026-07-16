import {
  HooksKind,
  MarketVersion,
  type Market,
  type MarketAccount,
  type PeriodicTermHooksConfig,
  ProposeAnnualInterestBipsStatus,
  QueueWithdrawalStatus,
  SetAprStatus,
} from "@wildcatfi/wildcat-sdk"

import {
  getAprChangeFlow,
  hooksConfigAllowsForceBuyBacks,
  getPendingAprProposalStatus,
  getPolicyTypeLabelKey,
  getPeriodicWithdrawalWindowNotice,
  getPeriodicWithdrawalWindowStatus,
  getWithdrawalActionState,
} from "@/utils/marketType"

const makePeriodicMarket = (
  overrides: Partial<PeriodicTermHooksConfig> = {},
  marketOverrides: Partial<Market> = {},
) =>
  ({
    version: MarketVersion.V2,
    hooksKind: HooksKind.PeriodicTerm,
    isClosed: false,
    hooksConfig: {
      hooksAddress: "0x0000000000000000000000000000000000000001",
      kind: HooksKind.PeriodicTerm,
      flags: {},
      transferRequiresAccess: false,
      depositRequiresAccess: false,
      transfersDisabled: false,
      queueWithdrawalRequiresAccess: false,
      firstWithdrawalWindowStart: 1_000,
      periodDuration: 100,
      withdrawalWindowDuration: 20,
      periodicTermClosed: false,
      pendingAnnualInterestBips: 0,
      pendingAnnualInterestProposalTimestamp: 0,
      pendingAnnualInterestResponseWindowStart: 0,
      pendingAnnualInterestResponseWindowEnd: 0,
      ...overrides,
    },
    annualInterestBips: 1_000,
    isInFixedTerm: false,
    ...marketOverrides,
  }) as unknown as Market

const makeFixedTermMarket = (marketOverrides: Partial<Market> = {}) =>
  ({
    version: MarketVersion.V2,
    hooksKind: HooksKind.FixedTerm,
    isClosed: false,
    isInFixedTerm: true,
    annualInterestBips: 1_000,
    hooksConfig: {
      kind: HooksKind.FixedTerm,
      fixedTermEndTime: 2_000,
    },
    ...marketOverrides,
  }) as unknown as Market

const makeMarketAccount = (
  market: Market,
  status: QueueWithdrawalStatus,
  hasBalance = true,
) =>
  ({
    market,
    withdrawalAvailability: status,
    marketBalance: {
      raw: {
        isZero: () => !hasBalance,
      },
    },
  }) as unknown as MarketAccount

const makeAprMarketAccount = (
  market: Market,
  setStatus: SetAprStatus,
  proposeStatus = ProposeAnnualInterestBipsStatus.Ready,
) =>
  ({
    market,
    previewSetAPR: () => ({
      status: setStatus,
      willChangeReserveRatio: false,
    }),
    previewProposeAnnualInterestBips: () => ({
      status: proposeStatus,
    }),
  }) as unknown as MarketAccount

describe("market type helpers", () => {
  describe("getPolicyTypeLabelKey", () => {
    it("keeps periodic policies distinct from fixed-term policies", () => {
      expect(getPolicyTypeLabelKey(HooksKind.PeriodicTerm)).toBe(
        HooksKind.PeriodicTerm,
      )
    })

    it("falls back unknown policy kinds to open term", () => {
      expect(getPolicyTypeLabelKey(undefined)).toBe(HooksKind.OpenTerm)
      expect(getPolicyTypeLabelKey(HooksKind.Unknown)).toBe(HooksKind.OpenTerm)
    })
  })

  describe("hooksConfigAllowsForceBuyBacks", () => {
    it("allows force buybacks only for hook kinds with that flag", () => {
      expect(
        hooksConfigAllowsForceBuyBacks({
          kind: HooksKind.OpenTerm,
          allowForceBuyBacks: true,
        } as Market["hooksConfig"]),
      ).toBe(true)
      expect(
        hooksConfigAllowsForceBuyBacks({
          kind: HooksKind.FixedTerm,
          allowForceBuyBacks: true,
        } as Market["hooksConfig"]),
      ).toBe(true)
      expect(
        hooksConfigAllowsForceBuyBacks(makePeriodicMarket().hooksConfig),
      ).toBe(false)
    })
  })

  describe("getPeriodicWithdrawalWindowStatus", () => {
    it("returns the first window before periodic withdrawals begin", () => {
      const status = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket(),
        990_000,
      )

      expect(status.phase).toBe("beforeFirstWindow")
      expect(status.isOpen).toBe(false)
      expect(status.nextWindowStart).toBe(1_000)
      expect(status.secondsUntilNextWindow).toBe(10)
    })

    it("returns the current window close time while a window is open", () => {
      const status = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket(),
        1_005_000,
      )

      expect(status.phase).toBe("open")
      expect(status.isOpen).toBe(true)
      expect(status.currentWindowStart).toBe(1_000)
      expect(status.currentWindowEnd).toBe(1_020)
      expect(status.secondsUntilWindowCloses).toBe(15)
    })

    it("returns the next window after the current window has closed", () => {
      const status = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket(),
        1_025_000,
      )

      expect(status.phase).toBe("closed")
      expect(status.isOpen).toBe(false)
      expect(status.currentWindowStart).toBe(1_000)
      expect(status.nextWindowStart).toBe(1_100)
      expect(status.secondsUntilNextWindow).toBe(75)
    })

    it("treats closed periodic terms as open for withdrawal requests", () => {
      const status = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket({ periodicTermClosed: true }),
        1_025_000,
      )

      expect(status.phase).toBe("termClosed")
      expect(status.isOpen).toBe(true)
    })

    it("describes closed and open periodic window notices", () => {
      const closed = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket(),
        1_025_000,
      )
      const open = getPeriodicWithdrawalWindowStatus(
        makePeriodicMarket(),
        1_005_000,
      )

      expect(getPeriodicWithdrawalWindowNotice(closed)).toContain(
        "scheduled windows",
      )
      expect(getPeriodicWithdrawalWindowNotice(open)).toContain("available now")
    })
  })

  describe("getPendingAprProposalStatus", () => {
    it("returns undefined when no periodic APR proposal is pending", () => {
      expect(getPendingAprProposalStatus(makePeriodicMarket())).toBeUndefined()
    })

    it("tracks proposal response window phases", () => {
      const market = makePeriodicMarket({
        pendingAnnualInterestBips: 750,
        pendingAnnualInterestProposalTimestamp: 1_000,
        pendingAnnualInterestResponseWindowStart: 1_100,
        pendingAnnualInterestResponseWindowEnd: 1_200,
      })

      expect(getPendingAprProposalStatus(market, 1_050_000)?.phase).toBe(
        "waitingForResponseWindow",
      )
      expect(getPendingAprProposalStatus(market, 1_150_000)?.phase).toBe(
        "responseWindowOpen",
      )
      expect(getPendingAprProposalStatus(market, 1_250_000)?.phase).toBe(
        "readyToApply",
      )
    })
  })

  describe("getWithdrawalActionState", () => {
    it("keeps periodic withdrawal action visible outside the window", () => {
      const state = getWithdrawalActionState(
        makeMarketAccount(
          makePeriodicMarket(),
          QueueWithdrawalStatus.OutsideWithdrawalWindow,
        ),
      )

      expect(state.isHidden).toBe(false)
      expect(state.isDisabled).toBe(true)
      expect(state.buttonKey).toBe("buttonWindowClosed")
    })

    it("hides withdrawal action when there is no market balance", () => {
      const state = getWithdrawalActionState(
        makeMarketAccount(
          makePeriodicMarket(),
          QueueWithdrawalStatus.Ready,
          false,
        ),
      )

      expect(state.isHidden).toBe(true)
      expect(state.isDisabled).toBe(true)
    })
  })

  describe("getAprChangeFlow", () => {
    it("proposes a periodic APR reduction when no proposal is pending", () => {
      const flow = getAprChangeFlow(
        makeAprMarketAccount(
          makePeriodicMarket(),
          SetAprStatus.NoPendingAprChange,
        ),
        900,
      )

      expect(flow.kind).toBe("proposePeriodicReduction")
      expect(flow.action).toBe("propose")
      expect(flow.isBlocked).toBe(false)
    })

    it("applies a periodic APR reduction when the pending proposal is ready", () => {
      const flow = getAprChangeFlow(
        makeAprMarketAccount(makePeriodicMarket(), SetAprStatus.Ready),
        900,
      )

      expect(flow.kind).toBe("applyPeriodicReduction")
      expect(flow.action).toBe("set")
      expect(flow.isBlocked).toBe(false)
    })

    it("blocks a fixed-term APR reduction", () => {
      const flow = getAprChangeFlow(
        makeAprMarketAccount(makeFixedTermMarket(), SetAprStatus.Ready),
        900,
      )

      expect(flow.kind).toBe("fixedTermReduction")
      expect(flow.isBlocked).toBe(true)
    })

    it("blocks applying a pending periodic APR proposal before it is ready", () => {
      const flow = getAprChangeFlow(
        makeAprMarketAccount(
          makePeriodicMarket(),
          SetAprStatus.AprChangeNotReady,
        ),
        900,
      )

      expect(flow.kind).toBe("blocked")
      expect(flow.action).toBe("set")
      expect(flow.isBlocked).toBe(true)
    })

    it("blocks replacing a mismatched pending periodic APR proposal", () => {
      const flow = getAprChangeFlow(
        makeAprMarketAccount(
          makePeriodicMarket(),
          SetAprStatus.AprChangeDoesNotMatchProposal,
        ),
        850,
      )

      expect(flow.kind).toBe("blocked")
      expect(flow.action).toBe("set")
      expect(flow.isBlocked).toBe(true)
    })
  })
})
