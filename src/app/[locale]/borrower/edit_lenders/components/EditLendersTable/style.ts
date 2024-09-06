import { COLORS } from "@/theme/colors"

export const AddedDot = {
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  marginRight: "4px",
}

export const UndoButton = {
  minWidth: "36px",
  padding: 0,
  color: COLORS.ultramarineBlue,
}

export const EditLendersTableStyles = {
  marginTop: "10px",

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
