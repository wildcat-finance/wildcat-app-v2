import { COLORS } from "@/theme/colors"

export const StartAdornmentStyle = {
  display: "flex",
  gap: "4px",
  alignItems: "center",
}

export const MenuPropsStyle = {
  "& .MuiPaper-root": {
    width: "180px",
    height: "fit-content",
    fontFamily: "inherit",
    padding: "0px",
    marginTop: "2px",
  },
}

export const SelectStyle = {
  width: "fit-content",
  height: "32px",
  "& .MuiSelect-icon": {
    display: "block",
    top: "5px",
    transform: "translate(3.5px, 0px) scale(0.7)",
    "&.MuiSelect-iconOpen": {
      transform: "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
    },

    "& path": { fill: `${COLORS.santasGrey}` },
  },
}

export const MenuHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 12px 8px",
  borderBottom: `1px solid ${COLORS.athensGrey}`,
}

export const MenuTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
}

export const MenuBodyStyle = {
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    borderBottom: `1px solid ${COLORS.athensGrey}`,
}
