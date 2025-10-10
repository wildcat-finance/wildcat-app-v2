import { COLORS } from "@/theme/colors"

export const MarketWithdrawalRequetstCell = {
  display: "flex",
  gap: "4px",
}

export const MarketLendersMLA = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

export const MLATableButton = {
  fontSize: 11,
  margin: "0",
  padding: "0",
  minWidth: "0px",
  color: COLORS.blueRibbon,
}

export const MarketWithdrawalRequestsContainer = {
  display: "flex",
  gap: "16px",
  flexDirection: "column",
}
export const DataGridCells = {
  "& .MuiDataGrid-cell": {
    padding: "0px 8px",
    cursor: "default",
    minHeight: "60px",
    height: "auto",
  },
  "& .MuiDataGrid-columnHeader": { padding: "0px 8px" },
}

export const NumberOfLenders = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  borderRadius: "8px",
  backgroundColor: COLORS.hintOfRed,
  padding: "8px 12px",
}
