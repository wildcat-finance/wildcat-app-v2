import { COLORS } from "@/theme/colors"

export const TabsStyles = {
  marginTop: "16px",
  height: "24px",
  minHeight: "24px",

  "& .MuiTabs-flexContainer": {
    alignItems: "flex-end",
  },
}

export const TabStyle = {
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: "20px",
  height: "24px",
  minHeight: "24px",
  minWidth: "fit-content",
  padding: "0 4px",

  borderColor: COLORS.athensGrey,
}

export const MarketsTableStyles = {
  height: "626px",

  overflow: "auto",
  width: "100%",
  padding: "0 16px",
  "& .MuiDataGrid-columnHeader": { padding: 0 },
  "& .MuiDataGrid-cell": { padding: "0px" },

  "& .MuiDataGrid-footerContainer": {
    "& .MuiToolbar-root": {
      padding: "32px 0 6px",
    },
  },
}
