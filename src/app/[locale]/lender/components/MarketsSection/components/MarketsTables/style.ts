import { COLORS } from "@/theme/colors"

export const DataGridSx = {
  overflow: "visible",
  maxWidth: "calc(100vw - 267px)",
  padding: "0 16px",
  "& .MuiDataGrid-main": { overflow: "visible" },
  "& .MuiDataGrid-virtualScroller": { overflow: "visible" },
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  "& .MuiDataGrid-columnHeader": {
    padding: 0,
  },
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
  },
  "& .MuiDataGrid-cell": {
    padding: "0px",
    minHeight: "66px",
    height: "auto",
  },
}
