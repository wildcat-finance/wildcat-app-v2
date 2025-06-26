import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  marginTop: "auto",
  zIndex: 9999,

  "& .MuiPaper-root.MuiDialog-paper": {
    margin: "auto 4px 4px",
    maxWidth: "100%",
    width: "100%",
    padding: "24px 12px 20px",
  },
  "& .MuiBackdrop-root": {
    marginTop: "auto",
    backgroundColor: "transparent",
    backdropFilter: "blur(20px)",
  },
}

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const CloseButtonIcon = {
  fontSize: "20px",
  "& path": { fill: `${COLORS.greySuit}` },
}

export const ButtonsContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "4px",
  margin: "20px 0",
}

export const Buttons = {
  height: "79px",
  justifyContent: "center",
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
  margin: "0 auto 7px",
}
