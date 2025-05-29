import { Theme, SxProps } from "@mui/material"

export const SummaryContainer = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 8px 8px 16px",
  [theme.breakpoints.down("sm")]: {
    padding: "16px 0",
    margin: "0 4px",
  },
  borderRadius: "12px",

  textWrap: "nowrap",
  cursor: "pointer",
})
