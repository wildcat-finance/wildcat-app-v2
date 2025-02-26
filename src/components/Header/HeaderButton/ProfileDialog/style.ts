import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  "& .MuiDialog-paper": {
    width: "320px",
    height: "276px",
    borderRadius: "12px",
    border: "none",
    margin: 0,
    padding: "16px",
  },
}

export const ContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}

export const WrongNetworkContainer = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  padding: "8px 8px 8px 12px",
  borderRadius: "12px",
  backgroundColor: COLORS.remy,
  color: COLORS.dullRed,
}

export const WrongNetworkButton = {
  backgroundColor: "transparent",
  color: COLORS.dullRed,
  lineHeight: "14px",
  borderColor: COLORS.azalea,
  transition: "border 0.2s",

  "&:hover": {
    borderColor: COLORS.dullRed,
    backgroundColor: "transparent",
  },
}

export const ProfileContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}

export const AddressContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "8px",
}

export const AddressButtons = {
  padding: 0,
  "& path": {
    fill: `${COLORS.greySuit}`,
    transition: "fill 0.2s",
  },
  "& :hover": { "& path": { fill: `${COLORS.santasGrey}` } },
}
