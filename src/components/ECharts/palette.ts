import { COLORS } from "@/theme/colors"

export const CHART_PALETTE = {
  semantic: {
    deposit: "#2FB875",
    withdrawal: "#E05252",
    withdrawalSoft: "#F2AEB8",
    netFlow: "#18AFCF",
    interest: "#5BAE51",
    neutral: COLORS.greySuit,
    warning: COLORS.galliano,
    danger: COLORS.carminePink,
    primary: COLORS.ultramarineBlue,
  },
  batch: {
    paid: "#A9DBA1",
    paidLate: "#EBC85F",
    unpaid: "#F2AEB8",
    shortfall: COLORS.carminePink,
  },
  risk: {
    healthy: "#A9DBA1",
    grace: "#EBC85F",
    penalty: "#F2AEB8",
    withdrawalQueue: COLORS.cornflowerBlue,
    penaltyFees: COLORS.blackRock,
  },
  categorical: [
    COLORS.ultramarineBlue,
    COLORS.cornflowerBlue,
    COLORS.galliano,
    COLORS.carminePink,
    COLORS.greySuit,
    COLORS.matteSilver,
  ],
  severityRamp: [
    COLORS.glitter,
    COLORS.hawkesBlue,
    COLORS.cornflowerBlue,
    COLORS.blueRibbon,
    COLORS.ultramarineBlue,
    COLORS.blackRock,
  ],
  ui: {
    axis: COLORS.santasGrey,
    text: COLORS.blackRock,
    grid: COLORS.athensGrey,
    tooltipBg: COLORS.blackRock,
    tooltipBorder: COLORS.iron,
    zoomFill: COLORS.blueRibbon01,
  },
} as const
