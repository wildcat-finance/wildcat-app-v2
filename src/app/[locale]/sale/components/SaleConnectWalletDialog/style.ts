import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  "& .MuiDialog-paper": {
    width: "320px",
    borderRadius: "12px",
    borderColor: COLORS.black01,
    margin: 0,
    padding: "24px 20px 20px",

    display: "flex",
    flexDirection: "column",
    rowGap: "32px",
  },
}

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const CloseButtonIcon = { "& path": { fill: `${COLORS.greySuit}` } }

export const ButtonsContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "4px",
}

export const Buttons = {
  justifyContent: "flex-start",
  columnGap: "12px",
  borderRadius: "0px 0px 0px 0px",
  "&:first-child": {
    borderRadius: "8px 8px 0px 0px",
  },
  "&:last-child": {
    borderRadius: "0px 0px 8px 8px",
  },
}

export const Terms = {
  maxWidth: "280px",
  textAlign: "center",
  color: COLORS.greySuit,
}
