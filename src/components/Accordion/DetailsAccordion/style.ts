import { Theme, SxProps } from "@mui/material"

export const SummaryContainer = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 8px 8px 16px",
  [theme.breakpoints.down("md")]: {
    padding: "10px 0px",
    margin: "0 4px",
    gap: "8px",
  },
  borderRadius: "12px",

  textWrap: "nowrap",
  cursor: "pointer",
})
