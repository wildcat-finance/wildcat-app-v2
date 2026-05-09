import { TOKENS } from "@/theme/colors"

export const DataGridSx = {
  overflow: "visible",
  height: "auto !important",
  maxWidth: "calc(100vw - 267px)",
  padding: "0 16px",
  "& .MuiDataGrid-main": {
    overflow: "visible",
    height: "auto !important",
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflow: "visible",
    height: "auto !important",
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScrollerContent": {
    height: "auto !important",
  },
  "& .MuiDataGrid-virtualScrollerRenderZone": {
    position: "static !important" as const,
    transform: "none !important",
  },
  // The column headers row is sticky-positioned, so it must stay opaque to
  // prevent rows from bleeding through when scrolling. We pin it to the same
  // surface-soft bg the accordion uses, so the whole "card" — summary row +
  // header row + body — reads as one continuous surface with no inset patch
  // before the sidebar.
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: TOKENS.surfaceCard,
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
