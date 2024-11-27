import { COLORS } from "@/theme/colors"

export const PenaltyRepayBtn = {
  width: "66px",
  backgroundColor: COLORS.carminePink,
  justifyContent: "space-between",
  alignItems: "center",
  marginRight: "8px",
  "&:hover": {
    background: COLORS.wildWatermelon,
    boxShadow: "none",
  },
}

export const PenaltyRepayBtnIcon = {
  transform: "rotate(180deg)",
  "& path": {
    fill: COLORS.white,
  },
}

export const DaysSubtitle = {
  color: COLORS.santasGrey,
  marginTop: "12px",
  padding: "0 16px",
}
