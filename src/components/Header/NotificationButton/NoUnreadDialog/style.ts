import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  "& .MuiDialog-paper": {
    height: "332px",
    width: "332px",
    borderRadius: "12px",
    margin: 0,
    padding: "20px",
    top: "72px",
    right: "180px",
    position: "absolute",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "6px",
  },
}

export const IconContainer = {
  borderRadius: "50%",
  border: `1px solid ${COLORS.greySuit}`,
  width: "40px",
  height: "40px",
  marginX: "auto",
  marginBottom: "14px"
}