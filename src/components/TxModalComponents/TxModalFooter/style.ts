import { SxProps, Theme } from "@mui/material"

export const TxModalFooterLink = {
  minHeight: "32px",
  display: "flex",
  gap: "8px",
  justifyContent: "center",
  alignItems: "center",
  margin: "0 auto",
  textDecoration: "none",
}

export const TxModalFooterContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  padding: "0 24px",
  display: "flex",
  gap: "8px",
  [theme.breakpoints.down("sm")]: {
    padding: "0 20px",
    gap: "4px",
  },
})
