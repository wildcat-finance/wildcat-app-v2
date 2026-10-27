import type { MetricValues } from "./api"
import { marketOverview } from "./marketOverview"
import { marketFixture } from "./storyFixtures"

const overview = (values: MetricValues) =>
  marketOverview({ ...marketFixture, values, comparisons: {} })

describe("compact market overview", () => {
  it("does not infer a perfect cash record or zero shortfall without recorded time", () => {
    const histories = [undefined, 0]
    histories.forEach((life) => {
      const data = overview({
        ...(life === undefined ? {} : { H01: life }),
        H02: 0,
        M18: 100,
        M26: 0,
        M23: 0,
      })
      const cash = data.summary.find(({ key }) => key === "2.1")!.card
      const longest = data.summary.find(({ key }) => key === "2.2")!.card
      expect(cash.value).toBeUndefined()
      expect(cash.detail?.value).toBe("not available")
      expect(longest.value).toBeUndefined()
      expect(cash.word).toBe(
        life === 0 ? "no recorded history" : "not available",
      )
    })
  })

  it("shows observed perfect availability with its thin-history qualification", () => {
    const values = { H01: 86_400, H02: 0, M18: 100, M26: 0, M23: 0, M05: 1 }
    const data = overview(values)
    expect(data.summary[0].card.value).toBe("100%")
    expect(data.summary[0].card.verdict).toBe("LIMITED")
    expect(data.summary[2].card.value).toBe("0 h")
    expect(
      overview({ ...values, H02: 1, M18: 99.999 }).summary[0].card.verdict,
    ).toBeUndefined()
  })

  it("keeps cash availability and rolling penalty time independent", () => {
    const data = overview({ H01: 100, H02: 10, M18: 90, M26: 20 })
    expect(data.summary[0].card.value).toBe("90%")
    expect(data.summary[0].card.detail?.value).toBe("80%")
    expect(data.summary[0].panel?.meaning).toContain("separate measurements")
  })

  it("uses duration without dividing by a zero allowance", () => {
    const data = overview({ H01: 86_400, H02: 14_400, M23: 4, M24: 0, M15: 0 })
    const longest = data.summary.find(({ key }) => key === "2.2")!
    expect(longest.card.value).toBe("4 h")
    expect(longest.card.detail?.value).toBe("No grace period")
    expect(longest.panel?.formula.join(" ")).toContain(
      "percentage of the allowance is undefined",
    )
  })

  it("keeps deadline funding distinct from current unpaid batches, including known zeros", () => {
    const data = overview({
      M30: 10,
      M31: 8,
      M32: 80,
      D18_LATE: 2,
      D18_NEVER: 0,
      M37: 3,
    })
    expect(
      data.funding.groups.map(({ label, value }) => [label, value]),
    ).toEqual([
      ["Funded on time", 8],
      ["Funded late", 2],
      ["Still unpaid", 0],
    ])
    expect(
      data.funding.groups.reduce((sum, group) => sum + group.value, 0),
    ).toBe(data.funding.total)
    expect(
      data.summary.find(({ key }) => key === "2.4")!.card.detail?.value,
    ).toBe("3")
  })

  it("retains missed deadlines when later funding is missing or inconsistent", () => {
    const splits = [
      { D18_LATE: "", D18_NEVER: "" },
      { D18_LATE: 1, D18_NEVER: 0 },
      { D18_LATE: -1, D18_NEVER: 3 },
    ]
    splits.forEach((split) => {
      const data = overview({ M30: 10, M31: 8, M32: 80, ...split })
      expect(
        data.funding.groups.map(({ label, value }) => [label, value]),
      ).toEqual([
        ["Funded on time", 8],
        ["Missed deadlines", 2],
      ])
    })
    expect(overview({ M30: 10, M31: 11 }).funding.groups).toEqual([])
    expect(overview({ M30: 0, M31: 0, M32: 0 }).funding.groups).toEqual([])
    expect(overview({ M30: 0, M31: 0, M32: 0 }).summary[1].card.word).toBe(
      "no exit history yet",
    )
  })

  it("preserves a residual penalty state when cash is no longer short", () => {
    const data = overview({ M77: "Open", M21: 0, M85: 1, M37: 0 })
    expect(data.summary.find(({ key }) => key === "2.4")!.card.state).toEqual({
      word: "Penalty active",
      tone: "bad",
    })
  })

  it("preserves grace timing and cure age inside the current-state disclosure", () => {
    const statePanel = (values: MetricValues) =>
      overview(values).summary.find(({ key }) => key === "2.4")!.panel!
    const within = statePanel({ M77: "Open", M21: 1, M85: 0, D05: 0 })
    expect(within.numbers).toContainEqual(["Grace remaining", "0 h"])
    const penalty = statePanel({
      M77: "Open",
      M21: 0,
      M85: 1,
      D05: "6.5 h past grace",
      M20: 1,
      M84: 0.5,
    })
    expect(penalty.numbers).toContainEqual(["Time above grace", "6.5 h"])
    expect(penalty.numbers).toContainEqual(["Last cured", "0.5 d ago"])
    expect(statePanel({ M77: "Open", M21: 1, M85: 0 }).numbers).toContainEqual([
      "Grace remaining",
      "not available",
    ])
    const clear = statePanel({
      M77: "Open",
      M21: 0,
      M85: 0,
      D05: "no countdown (not late)",
      M20: 1,
      M84: 0.5,
    })
    expect(clear.numbers).toContainEqual(["Last cured", "0.5 d ago"])
    expect(
      clear.numbers?.some(
        ([label]) =>
          label === "Grace remaining" || label === "Time above grace",
      ),
    ).toBe(false)
    const inactive: MetricValues[] = [
      { M77: "Closed", M21: 1, M85: 1 },
      { M77: "Open" },
    ]
    inactive.forEach((flags) => {
      const panel = statePanel({ ...flags, D05: 6, M20: 1, M84: 0.5 })
      expect(
        panel.numbers?.some(([label]) =>
          ["Last cured", "Grace remaining", "Time above grace"].includes(label),
        ),
      ).toBe(false)
    })
  })

  it("does not turn no yield history or no deposit capacity into a measured zero", () => {
    const data = overview({ M11: 0, M39: 0, M41: 0, M06: 0, M86: 0 })
    const apr = data.summary.find(({ key }) => key === "2.5")!.card
    expect(apr.value).toBe("0%")
    expect(apr.detail?.value).toBe("no yield history yet")
    expect(
      data.facts.find(({ label }) => label === "Capacity used")?.value,
    ).toBe("No deposit capacity")
    expect(
      overview({}).facts.every(({ value }) => value === "not available"),
    ).toBe(true)
  })
})
