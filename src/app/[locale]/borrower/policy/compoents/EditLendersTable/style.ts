import { COLORS } from "@/theme/colors"

export const AddedDot = {
  backgroundColor: COLORS.ultramarineBlue,
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  marginRight: "4px",
}

export const UndoButton = {
  minWidth: "36px",
  marginRight: "5px",
  padding: 0,
  color: COLORS.ultramarineBlue,
}

export const EditLendersTableStyles = {
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

export const NoLendersBox = {
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
}

export const ResetButtonStyles = {
  color: COLORS.ultramarineBlue,
  "&:hover": {
    color: COLORS.ultramarineBlue,
  },
}
