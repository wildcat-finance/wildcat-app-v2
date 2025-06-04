import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const TotalAccordionSummary = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 8px 8px 16px",
  [theme.breakpoints.down("sm")]: {
    borderRadius: "10px",
    textWrap: "nowrap",
    backgroundColor: COLORS.whiteSmoke,
    margin: "24px -12px 0 -12px",
  },
})

export const MarketWithdrawalRequetstCell = {
  display: "flex",
  gap: "4px",
}

export const MarketWithdrawalRequestsContainer = (
  theme: Theme,
): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    backgroundColor: COLORS.white,
    borderRadius: "14px",
    padding: "12px 16px 12px",
    margin: "0px",
  },
})

export const DataGridCells = {
  padding: "0px 16px 0px 16px",
  "& .MuiDataGrid-topContainer": { marginBottom: "8px" },
  "& .MuiDataGrid-cell": { padding: "0px", minHeight: "52px", height: "auto" },
  "& .MuiDataGrid-columnHeader": { padding: "0px" },
}
