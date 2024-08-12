import { COLORS } from "@/theme/colors"

export const TotalAccordionSummary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 8px 8px 16px",

  borderRadius: "12px",

  textWrap: "nowrap",

  backgroundColor: COLORS.whiteSmoke,
  margin: "24px 0 12px",
  marginBottom: "8px",
}

export const MarketWithdrawalRequetstCell = {
  display: "flex",
  gap: "4px",
}

export const MarketWithdrawalRequestsContainer = {
  display: "flex",
  flexDirection: "column",
}
export const DataGridCells = {
  padding: "0px 16px 0px 16px",
  "& .MuiDataGrid-topContainer": { marginBottom: "8px" },
  "& .MuiDataGrid-cell": { padding: "0px" },
  "& .MuiDataGrid-columnHeader": { padding: "0px" },
}
