import { COLORS } from "@/theme/colors"

// Design language v1 tokens. Neutrals carry structure and every figure;
// green, amber and red appear only on a state, a verdict or a chart segment
// meaning in order, within grace or past the allowance.

export const GD = {
  ink: COLORS.bunker,
  text: COLORS.blackRock,
  muted: COLORS.manate,
  border: COLORS.whiteLilac,
  borderHover: "#D4D6DD",
  borderOpen: COLORS.bunker,
  surface: COLORS.white,
  track: COLORS.whiteSmoke,
  trackInBox: COLORS.athensGrey,
  ghost: "#D4D6DD",
  /** "This one" within a population. */
  thisOne: "#4112B5",
  link: COLORS.blueRibbon,
  inOrder: "#2E9E5B",
  withinGrace: COLORS.galliano,
  pastAllowance: COLORS.dullRed,
  stateGood: "#23824B",
  stateWarn: COLORS.butteredRum,
  stateBad: COLORS.dullRed,
  transition: "border-color 160ms cubic-bezier(0, 0, 0.2, 1)",
} as const

export type Verdict = "STRONG" | "WATCH" | "PROBLEM" | "LIMITED"

export const VERDICT_STYLE: Record<
  Verdict,
  { color: string; background: string }
> = {
  STRONG: { color: GD.stateGood, background: COLORS.lightGreen },
  WATCH: { color: COLORS.butteredRum, background: COLORS.oasis },
  PROBLEM: { color: COLORS.dullRed, background: COLORS.remy },
  LIMITED: { color: COLORS.manate, background: COLORS.athensGrey },
}

export type StateTone = "good" | "warn" | "bad" | "neutral"

export const STATE_COLOR: Record<StateTone, string> = {
  good: GD.stateGood,
  warn: GD.stateWarn,
  bad: GD.stateBad,
  neutral: GD.muted,
}

export const STATE_DOT: Record<StateTone, string> = {
  good: GD.inOrder,
  warn: GD.withinGrace,
  bad: GD.pastAllowance,
  neutral: GD.ghost,
}
