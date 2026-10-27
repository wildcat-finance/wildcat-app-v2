import { COLORS } from "@/theme/colors"

// Design language v1 tokens. Neutrals carry structure and every figure;
// green, amber and red appear only on a state, a verdict or a chart segment
// meaning in order, within grace or past the allowance.

export const GD = {
  ink: COLORS.bunker,
  text: COLORS.blackRock,
  muted: "#656779",
  border: COLORS.whiteLilac,
  panelBorder: "#C7CCDE",
  borderHover: COLORS.hawkesBlue,
  borderOpen: COLORS.cornflowerBlue,
  surface: COLORS.white,
  accent: COLORS.glitter,
  accentInk: "#3154CE",
  selected: "#F7F9FF",
  track: COLORS.whiteSmoke,
  trackInBox: COLORS.athensGrey,
  ghost: "#D4D6DD",
  /** "This one" within a population. */
  thisOne: COLORS.blueRibbon,
  link: COLORS.blueRibbon,
  inOrder: "#2E9E5B",
  withinGrace: COLORS.galliano,
  pastAllowance: COLORS.dullRed,
  /** A missed exit deadline that was funded later. */
  fundedLate: "#F47C8A",
  stateGood: "#23824B",
  stateWarn: COLORS.butteredRum,
  stateBad: COLORS.dullRed,
  transition: "border-color 160ms ease, background-color 160ms ease",
} as const

export type Verdict = "STRONG" | "WATCH" | "PROBLEM" | "LIMITED"

export const VERDICT_STYLE: Record<
  Verdict,
  { color: string; background: string }
> = {
  STRONG: { color: GD.stateGood, background: COLORS.lightGreen },
  WATCH: { color: COLORS.butteredRum, background: COLORS.oasis },
  PROBLEM: { color: COLORS.dullRed, background: COLORS.remy },
  LIMITED: { color: "#656779", background: COLORS.athensGrey },
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
