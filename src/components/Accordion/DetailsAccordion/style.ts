import { Theme, SxProps } from "@mui/material"

export const SummaryContainer = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 8px 8px 16px",
  [theme.breakpoints.down("md")]: {
    paddingTop: "10px",
    paddingBottom: "10px",
    paddingRight: "0px",
    paddingLeft: "0px",
    margin: "0 4px",
  },
  borderRadius: "12px",

  textWrap: "nowrap",
  cursor: "pointer",
})
