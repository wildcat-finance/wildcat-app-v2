import { resolveWithdrawalQueueRaw } from "./withdrawQueue"

const bn = (value: number | string) => BigInt(value)

describe("resolveWithdrawalQueueRaw", () => {
  it("queues accrued value above the pre-unwrap direct balance for wrapped-only Max", () => {
    const previewedWrappedAmount = bn(50)
    const directBeforeUnwrap = bn(100)
    const liveAfterUnwrapAndAccrual = bn(153)

    const queued = resolveWithdrawalQueueRaw({
      intent: previewedWrappedAmount,
      live: liveAfterUnwrapAndAccrual,
      isMaxRequested: true,
      keepsDirect: true,
      directBeforeUnwrap,
    })

    expect(queued).toBe(bn(53))
    expect(queued > previewedWrappedAmount).toBe(true)
    expect(liveAfterUnwrapAndAccrual - queued).toBe(directBeforeUnwrap)
  })

  it("uses the previewed Max as a rounding floor instead of leaving a residual", () => {
    const previewedWrappedAmount = bn(50)
    const directBeforeUnwrap = bn(100)
    // `live` and `direct` were normalized separately, so the subtraction can
    // come out one unit short.
    const liveAfterUnwrap = bn(149)

    const queued = resolveWithdrawalQueueRaw({
      intent: previewedWrappedAmount,
      live: liveAfterUnwrap,
      isMaxRequested: true,
      keepsDirect: true,
      directBeforeUnwrap,
    })

    expect(queued).toBe(previewedWrappedAmount)
    expect(queued >= liveAfterUnwrap - directBeforeUnwrap).toBe(true)
  })

  it.each([
    {
      name: "clamps a partial request to the live balance",
      intent: 60,
      live: 55,
      isMaxRequested: false,
      keepsDirect: true,
      directBeforeUnwrap: 20,
      expected: 55,
    },
    {
      name: "sweeps the full live balance when Max does not preserve a direct floor",
      intent: 50,
      live: 53,
      isMaxRequested: true,
      keepsDirect: false,
      directBeforeUnwrap: undefined,
      expected: 53,
    },
    {
      name: "falls back to the clamped intent when the direct snapshot is unavailable",
      intent: 60,
      live: 55,
      isMaxRequested: true,
      keepsDirect: true,
      directBeforeUnwrap: undefined,
      expected: 55,
    },
  ])("$name", ({ expected, ...args }) => {
    const queued = resolveWithdrawalQueueRaw({
      intent: bn(args.intent),
      live: bn(args.live),
      isMaxRequested: args.isMaxRequested,
      keepsDirect: args.keepsDirect,
      directBeforeUnwrap:
        args.directBeforeUnwrap === undefined
          ? undefined
          : bn(args.directBeforeUnwrap),
    })

    expect(queued).toBe(bn(expected))
  })
})
