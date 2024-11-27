import { COLORS } from "@/theme/colors"

export const AprModalDialog = {
  "& .MuiDialog-paper": {
    height: "440px",
    width: "500px",
    border: "none",
    borderRadius: "20px",
    margin: 0,
    padding: "24px 0",
  },
}

export const AprModalMessageBox = {
  display: "flex",
  gap: "4px",
  alignItems: "center",
}

export const AprAffectsBox = {
  display: "flex",
  flexDirection: "column",
  padding: "0 12px",
}

export const AprModalConfirmedBox = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  padding: "0 12px",
}

export const AprModalFormLabel = {
  margin: "auto 0 8px",
  padding: "0 12px",
  columnGap: "12px",
  maxWidth: "440px",

  "& .MuiTypography-root": {
    color: COLORS.santasGrey,
  },
}

export const AprModalCheckbox = {
  transform: "scale(1.43)",
  "& ::before": {
    transform: "translate(-3px, -3px) scale(0.75)",
  },
}
