import { COLORS } from "@/theme/colors"

export const AddedDot = {
  backgroundColor: COLORS.ultramarineBlue,
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  marginRight: "4px",
}

export const MarketsBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
  padding: "14px 0",
}

export const AlertBox = {
  backgroundColor: COLORS.oasis,
  padding: "12px 16px",
  borderRadius: "12px",
  margin: "25px 0",

  display: "flex",
  alignItems: "center",
  gap: "16px",
}

export const TableStyles = {
  "& .MuiDataGrid-cell": {
    minHeight: "52px",
    height: "auto",
    padding: "12px 8px",
    cursor: "default",
  },

  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "transparent",
    padding: "0 8px",
  },
}

export const ButtonsBox = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  paddingTop: "10px",
}