import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

export const TabsStyles = {
  marginTop: "16px",
  height: "24px",
  minHeight: "24px",

  "& .MuiTabs-flexContainer": {
    alignItems: "flex-end",
  },
}

export const TabStyle = {
  fontSize: pxToRem(13),
  lineHeight: lh(20, 13),
  fontWeight: 500,
  height: "24px",
  minHeight: "24px",
  minWidth: "fit-content",
  padding: "0 4px",

  borderColor: COLORS.athensGrey,
}

export const MarketsTableStyles = {
  height: "626px",

  overflow: "auto",
  maxWidth: "calc(100vw - 267px)",
  padding: "0 16px",
  "& .MuiDataGrid-columnHeader": { padding: 0 },
  "& .MuiDataGrid-cell": { padding: "0px" },

  "& .MuiDataGrid-footerContainer": {
    "& .MuiToolbar-root": {
      padding: "32px 0 6px",
    },
  },
}
