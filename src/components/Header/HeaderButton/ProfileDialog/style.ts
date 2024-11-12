import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  "& .MuiDialog-paper": {
    borderRadius: "12px",
    borderColor: COLORS.black01,
    margin: 0,
    padding: "24px 16px 16px 16px",
  },
}

export const ContentContainer = {
  height: "248px",
  width: "288px",
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
