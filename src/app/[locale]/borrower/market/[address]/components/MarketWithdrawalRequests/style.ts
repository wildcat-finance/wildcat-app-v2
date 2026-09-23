import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const TotalAccordionSummary = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 8px 8px 16px",
  [theme.breakpoints.down("md")]: {
    borderRadius: "10px",
    textWrap: "nowrap",
    backgroundColor: COLORS.whiteSmoke,
    margin: "24px -8px 0px",
    padding: "4px 12px",
  },
})

export const MarketWithdrawalRequetstCell = {
  display: "flex",
  gap: "4px",
}

export const WithdrawalRequestsEntryStack = {
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "16px 0",
  boxSizing: "border-box",
}

export const WithdrawalRequestsEntry = {
  ...MarketWithdrawalRequetstCell,
  flex: 1,
  minHeight: "20px",
  alignItems: "center",
}

export const withdrawalRequestsFirstEntry = (count: number) => ({
  ...WithdrawalRequestsEntry,
  flex: `0 0 ${100 / Math.max(count, 1)}%`,
})

export const MarketWithdrawalRequestsContainer = (
  theme: Theme,
): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    backgroundColor: COLORS.white,
    borderRadius: "14px",
    padding: "12px 16px 12px",
    margin: "0px",
  },
})

export const DataGridCells = {
  padding: "0px 16px 0px 16px",
  "& .MuiDataGrid-cell": { padding: "0px", minHeight: "52px", height: "auto" },
  "& .MuiDataGrid-columnHeader": { padding: "0px" },
}
