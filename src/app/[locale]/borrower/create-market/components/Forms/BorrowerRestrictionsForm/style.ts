import { COLORS } from "@/theme/colors"

export const SwitchStyle = {
  "& .MuiSwitch-switchBase": {
    "&.Mui-checked": {
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: COLORS.carminePink,
      },
    },
  },
  "& .MuiSwitch-track": {
    opacity: 1,
  },
}

export const AlertContainer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "4px",
  padding: "16px",
  borderRadius: "12px",
  marginTop: "24px",
  backgroundColor: COLORS.remy,
}

export const TextContainer = {
  display: "flex",
  flexDirection: "column",
}

export const MoreInfoButton = {
  backgroundColor: "transparent",
  color: COLORS.dullRed,
  borderColor: COLORS.azalea,
  transition: "border 0.2s",

  "&:hover": {
    borderColor: COLORS.dullRed,
    backgroundColor: "transparent",
  },
}
