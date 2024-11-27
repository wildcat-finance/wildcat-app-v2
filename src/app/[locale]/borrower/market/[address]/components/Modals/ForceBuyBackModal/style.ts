import { maxWidth } from "@mui/system"

import { COLORS } from "@/theme/colors"

export const TxModalDialog = {
  "& .MuiDialog-paper": {
    height: "404px",
    width: "440px",
    maxWidth: "440px",
    border: "none",
    borderRadius: "20px",
    margin: 0,
    padding: "24px 0",
  },
}

export const TxModalInfoItem = {
  display: "flex",
  justifyContent: "space-between",
  maxWidth: "440px",
}

export const TxModalInfoTitle = { color: COLORS.santasGrey }
